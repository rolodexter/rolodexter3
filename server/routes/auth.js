const { Router } = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const tokenVerifier = require('../utils/token-verifier');
const config = require('../config');
const router = Router();

// API Key Configuration
const API_CONFIG = {
    PRIMARY_KEY: process.env.OPENROUTER_API_KEY,
    FALLBACK_KEY: process.env.OPENROUTER_FALLBACK_KEY,
    MAX_RETRIES: 3,
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100
};

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: API_CONFIG.RATE_LIMIT_WINDOW,
    max: API_CONFIG.RATE_LIMIT_MAX,
    message: { error: 'Rate limit exceeded' }
});

// Key rotation and management
class KeyManager {
    constructor() {
        this.currentKey = API_CONFIG.PRIMARY_KEY;
        this.isUsingFallback = false;
        this.failureCount = 0;
    }

    getCurrentKey() {
        return this.currentKey;
    }

    switchToFallback() {
        if (!this.isUsingFallback && API_CONFIG.FALLBACK_KEY) {
            this.currentKey = API_CONFIG.FALLBACK_KEY;
            this.isUsingFallback = true;
            return true;
        }
        return false;
    }

    resetToPrimary() {
        this.currentKey = API_CONFIG.PRIMARY_KEY;
        this.isUsingFallback = false;
        this.failureCount = 0;
    }

    async handleFailure() {
        this.failureCount++;
        if (this.failureCount >= API_CONFIG.MAX_RETRIES) {
            const switched = this.switchToFallback();
            if (!switched) {
                throw new Error('All API keys exhausted');
            }
            this.failureCount = 0;
            return true;
        }
        return false;
    }
}

const keyManager = new KeyManager();

// Secure token generation
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Session token validation
function validateToken(token) {
    // Add your token validation logic here
    return token && token.length === 64;
}

// Authentication middleware
function authenticateRequest(req, res, next) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!validateToken(token)) {
        return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    req.apiKey = keyManager.getCurrentKey();
    next();
}

// Solana wallet authentication
async function validateWalletSignature(message, signature, publicKey) {
    try {
        const messageBytes = new TextEncoder().encode(message);
        const publicKeyObj = new PublicKey(publicKey);
        const signatureBytes = bs58.decode(signature);
        
        return await PublicKey.verify(messageBytes, signatureBytes, publicKeyObj);
    } catch (error) {
        console.error('Signature validation error:', error);
        return false;
    }
}

// Enhanced Solana wallet authentication with role-based access
async function authenticateWallet(req, res, next) {
    const { message, signature, publicKey } = req.headers;
    
    if (!message || !signature || !publicKey) {
        return res.status(401).json({ error: 'Missing authentication parameters' });
    }
    
    try {
        // Verify signature
        const isValid = await validateWalletSignature(message, signature, publicKey);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        // Check whitelist
        if (config.tokens.whitelistedAddresses.includes(publicKey)) {
            req.walletAddress = publicKey;
            req.accessLevel = 'premium';
            return next();
        }
        
        // Verify token-based access
        const accessResult = await tokenVerifier.verifyWalletAccess(publicKey);
        if (!accessResult.hasAccess) {
            return res.status(403).json({ 
                error: 'Insufficient tokens',
                required: {
                    governanceToken: config.tokens.minRequiredBalance,
                    nfts: config.tokens.requiredNFTs
                }
            });
        }
        
        req.walletAddress = publicKey;
        req.accessLevel = accessResult.level;
        next();
    } catch (error) {
        console.error('Wallet authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// Rate limiting based on access level
const createRateLimiter = (windowMs, max, accessLevel) => {
    return rateLimit({
        windowMs,
        max: (req) => req.accessLevel === accessLevel ? max : Math.floor(max / 2),
        message: { error: 'Rate limit exceeded' }
    });
};

// Different rate limits for different access levels
const standardLimiter = createRateLimiter(15 * 60 * 1000, 100, 'standard');
const premiumLimiter = createRateLimiter(15 * 60 * 1000, 300, 'premium');

// Token gating middleware
async function checkTokenGating(req, res, next) {
    const walletAddress = req.walletAddress;
    
    try {
        // Implement token balance check here
        const hasRequiredTokens = await checkWalletTokenBalance(walletAddress);
        if (!hasRequiredTokens) {
            return res.status(403).json({ 
                error: 'Insufficient tokens',
                message: 'This endpoint requires holding specific tokens' 
            });
        }
        next();
    } catch (error) {
        console.error('Token gating error:', error);
        res.status(500).json({ error: 'Failed to verify token holdings' });
    }
}

// Monitor middleware
async function monitorRequest(req, res, next) {
    const startTime = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to capture response time
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        
        // Log metrics
        fetch('/api/monitor/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                responseTime,
                endpoint: req.path,
                status: res.statusCode,
                error: res.statusCode >= 400 ? args[0] : null
            })
        }).catch(console.error);
        
        originalEnd.apply(res, args);
    };
    
    next();
}

// Add monitoring to existing middleware
router.use(monitorRequest);

// Token endpoint
router.post('/token', limiter, async (req, res) => {
    try {
        const token = generateSecureToken();
        // Store token with short expiry (e.g., in Redis)
        res.json({ token, expires: Date.now() + API_CONFIG.RATE_LIMIT_WINDOW });
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

// OpenRouter proxy endpoint
router.post('/chat', 
    authenticateWallet,
    (req, res, next) => {
        if (req.accessLevel === 'premium') {
            return premiumLimiter(req, res, next);
        }
        return standardLimiter(req, res, next);
    },
    authenticateRequest,
    async (req, res) => {
    let attempts = 0;
    const maxAttempts = API_CONFIG.MAX_RETRIES;
    const startTime = Date.now();

    while (attempts < maxAttempts) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${req.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Request-ID': crypto.randomUUID()
                },
                body: JSON.stringify(req.body)
            });

            // Monitor rate limits
            const remainingRequests = response.headers.get('x-ratelimit-remaining');
            if (remainingRequests) {
                await updateRateLimitMetrics(parseInt(remainingRequests));
            }

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Log success metrics
            await logMetrics({
                type: 'success',
                duration: Date.now() - startTime,
                attempts,
                endpoint: '/chat'
            });

            return res.json(data);
        } catch (error) {
            attempts++;
            const switched = await keyManager.handleFailure();
            
            // Log failure metrics
            await logMetrics({
                type: 'error',
                duration: Date.now() - startTime,
                attempts,
                error: error.message,
                keySwitched: switched
            });
            
            if (switched || attempts >= maxAttempts) {
                return res.status(500).json({ 
                    error: 'API request failed after multiple attempts',
                    details: error.message
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
    }
});

// Add endpoint to check wallet access status
router.get('/access-status', authenticateWallet, async (req, res) => {
    try {
        const accessResult = await tokenVerifier.verifyWalletAccess(req.walletAddress);
        res.json({
            accessLevel: accessResult.level,
            requirements: {
                governanceToken: config.tokens.minRequiredBalance,
                premiumThreshold: config.tokens.premiumThreshold,
                nfts: config.tokens.requiredNFTs
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check access status' });
    }
});

async function updateRateLimitMetrics(remaining) {
    try {
        await fetch('/api/monitor/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'rateLimit',
                remaining
            })
        });
    } catch (error) {
        console.error('Failed to update rate limit metrics:', error);
    }
}

async function logMetrics(data) {
    try {
        await fetch('/api/monitor/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error('Failed to log metrics:', error);
    }
}

async function logFailure(error) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] API Failure: ${error.message}\n`;
    
    // Append to debug log
    await appendToDebugLog(logEntry);
}

async function appendToDebugLog(entry) {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const debugLogPath = path.join(__dirname, '../../memory/rolodexterVS-debug.md');
        
        await fs.appendFile(debugLogPath, entry);
    } catch (error) {
        console.error('Failed to write to debug log:', error);
    }
}

module.exports = router;