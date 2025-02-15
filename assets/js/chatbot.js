// API Configuration and Security
const API_CONFIG = {
    baseUrl: 'https://openrouter.ai/api/v1',
    retryAttempts: 3,
    retryDelay: 1000, // Base delay in ms
    maxDelay: 10000   // Maximum delay in ms
};

class ChatbotAPI {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.pendingRequests = [];
        this.retryCount = 0;
        this.maxRetries = 3;
        this.pendingRequests = new Map();
        this.rateLimiter = new RateLimiter(60, 'minute'); // 60 requests per minute
        this.debugLog = [];
        this.setupDebugMonitoring();
    }

    setupDebugMonitoring() {
        // Monitor authentication state changes
        this.authStateChange = (state) => {
            this.logDebug('AUTH_STATE', state);
        };

        // Monitor rate limiting
        this.rateLimitMonitor = setInterval(() => {
            if (this.rateLimiter) {
                const metrics = this.rateLimiter.getMetrics();
                this.logDebug('RATE_LIMIT', metrics);
            }
        }, 60000); // Check every minute
    }

    async initialize() {
        await this.ensureValidToken();
    }

    async ensureValidToken() {
        const startTime = performance.now();
        try {
            if (this.isTokenValid()) {
                this.logDebug('TOKEN_CHECK', { status: 'valid', token: this.token });
                return this.token;
            }

            if (this.isRefreshing) {
                this.logDebug('TOKEN_REFRESH', { status: 'waiting' });
                return new Promise(resolve => {
                    this.pendingRequests.push(resolve);
                });
            }

            this.isRefreshing = true;
            this.logDebug('TOKEN_REFRESH', { status: 'started' });

            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            const { token, expires } = await response.json();
            this.token = token;
            this.tokenExpiry = expires;
            
            this.logDebug('TOKEN_REFRESH', { 
                status: 'success', 
                duration: performance.now() - startTime 
            });

            // Resume pending requests
            this.pendingRequests.forEach(resolve => resolve(token));
            this.pendingRequests = [];
            
            return token;
        } catch (error) {
            this.logDebug('TOKEN_REFRESH', { 
                status: 'error', 
                error: error.message,
                duration: performance.now() - startTime 
            });
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    isTokenValid() {
        return this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }

    async sendMessage(message) {
        const startTime = performance.now();
        try {
            const token = await this.ensureValidToken();
            this.logDebug('MESSAGE_SEND', { status: 'started', messageLength: message.length });

            const response = await this.makeAuthenticatedRequest('/api/auth/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            this.retryCount = 0; // Reset retry count on success
            const result = await response.json();
            
            this.logDebug('MESSAGE_SEND', { 
                status: 'success', 
                duration: performance.now() - startTime,
                responseLength: JSON.stringify(result).length
            });

            return result;
        } catch (error) {
            this.logDebug('MESSAGE_SEND', { 
                status: 'error', 
                error: error.message,
                duration: performance.now() - startTime
            });
            return await this.handleRequestError(error, message);
        }
    }

    async makeAuthenticatedRequest(url, options) {
        const token = await this.ensureValidToken();
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, options);
        
        if (response.status === 401) {
            // Token might be invalid, try to refresh
            this.token = null;
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                return this.makeAuthenticatedRequest(url, options);
            }
        }
        
        return response;
    }

    async handleRequestError(error, message) {
        await this.logDebug('REQUEST_ERROR', {
            error: error.message,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries
        });

        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.sendMessage(message);
        }

        throw new Error('Failed to send message after multiple attempts');
    }

    async logError(error) {
        try {
            const timestamp = new Date().toISOString();
            const debugEntry = {
                timestamp,
                error: error.message,
                retryCount: this.retryCount
            };

            await fetch('/api/debug/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(debugEntry)
            });
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
    }

    async logDebug(type, data) {
        const debugEntry = {
            timestamp: new Date().toISOString(),
            type,
            data
        };

        this.debugLog.push(debugEntry);
        if (this.debugLog.length > 1000) {
            this.debugLog.shift(); // Keep last 1000 entries
        }

        try {
            await fetch('/api/debug/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    component: 'CHATBOT',
                    ...debugEntry
                })
            });
        } catch (error) {
            console.error('Failed to log debug entry:', error);
        }
    }

    async makeRequestWithRetry(requestFn) {
        let lastError;
        for (let attempt = 0; attempt < API_CONFIG.retryAttempts; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                if (!this.shouldRetry(error)) {
                    throw error;
                }
                await this.delay(this.getRetryDelay(attempt));
            }
        }
        throw lastError;
    }

    shouldRetry(error) {
        // Retry on network errors or 5xx server errors
        return !error.response || (error.response && error.response.status >= 500);
    }

    getRetryDelay(attempt) {
        const delay = Math.min(
            API_CONFIG.maxDelay,
            API_CONFIG.retryDelay * Math.pow(2, attempt)
        );
        return delay + Math.random() * 1000; // Add jitter
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    processResponse(response) {
        // Sanitize and validate response
        if (!response || !response.choices || !response.choices[0]) {
            throw new Error('Invalid response format');
        }

        const { content } = response.choices[0].message;
        return this.sanitizeContent(content);
    }

    sanitizeContent(content) {
        // Basic XSS prevention
        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim();
    }

    cleanup() {
        clearInterval(this.rateLimitMonitor);
    }
}

// Rate Limiter Implementation
class RateLimiter {
    constructor(limit, interval) {
        this.limit = limit;
        this.interval = this.parseInterval(interval);
        this.requests = [];
    }

    parseInterval(interval) {
        const intervals = {
            second: 1000,
            minute: 60000,
            hour: 3600000
        };
        return intervals[interval] || 60000;
    }

    async canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.interval);
        
        if (this.requests.length >= this.limit) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }
}

// Initialize chatbot with error handling
try {
    const chatbot = new ChatbotAPI();
    chatbot.initialize().catch(error => {
        console.error('Chatbot initialization failed:', error);
        chatbot.logDebug('INIT_ERROR', { error: error.message });
    });

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        chatbot.cleanup();
    });

    export { chatbot };
} catch (error) {
    console.error('Failed to create ChatbotAPI instance:', error);
    // Log to debug file even if initialization fails
    fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            component: 'CHATBOT',
            type: 'FATAL_ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        })
    }).catch(console.error);
}