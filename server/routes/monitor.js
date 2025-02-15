const { Router } = require('express');
const router = Router();

class APIMonitor {
    constructor() {
        this.requestLog = [];
        this.errorLog = [];
        this.tokenRotations = [];
        this.rateLimitWarningThreshold = 0.8; // 80% of rate limit
    }

    logRequest(requestData) {
        const timestamp = new Date().toISOString();
        this.requestLog.push({ timestamp, ...requestData });
        this.trimLog(this.requestLog);
        
        // Check rate limit threshold
        if (requestData.remainingRequests / requestData.totalRequests < this.rateLimitWarningThreshold) {
            this.logWarning('Rate limit threshold reached', {
                remaining: requestData.remainingRequests,
                total: requestData.totalRequests
            });
        }
    }

    logError(error) {
        const timestamp = new Date().toISOString();
        this.errorLog.push({ timestamp, error });
        this.trimLog(this.errorLog);
        
        // Write to debug file
        this.writeToDebugLog({
            type: 'ERROR',
            timestamp,
            details: error
        });
    }

    logTokenRotation(details) {
        const timestamp = new Date().toISOString();
        this.tokenRotations.push({ timestamp, ...details });
        this.trimLog(this.tokenRotations);
        
        this.writeToDebugLog({
            type: 'TOKEN_ROTATION',
            timestamp,
            details
        });
    }

    logWarning(message, data) {
        this.writeToDebugLog({
            type: 'WARNING',
            timestamp: new Date().toISOString(),
            message,
            data
        });
    }

    async writeToDebugLog(entry) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const debugLogPath = path.join(__dirname, '../../memory/rolodexterVS-debug.md');
            
            const logEntry = `
### ${entry.timestamp}
- **Type:** ${entry.type}
${entry.message ? `- **Message:** ${entry.message}` : ''}
\`\`\`json
${JSON.stringify(entry.details || entry.data, null, 2)}
\`\`\`
`;
            
            await fs.appendFile(debugLogPath, logEntry);
        } catch (error) {
            console.error('Failed to write to debug log:', error);
        }
    }

    trimLog(log, maxEntries = 1000) {
        if (log.length > maxEntries) {
            log.splice(0, log.length - maxEntries);
        }
    }

    getMetrics() {
        return {
            totalRequests: this.requestLog.length,
            errorRate: this.errorLog.length / this.requestLog.length,
            tokenRotations: this.tokenRotations.length,
            recentErrors: this.errorLog.slice(-5)
        };
    }
}

const apiMonitor = new APIMonitor();

// Monitoring middleware
router.use(async (req, res, next) => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function(...args) {
        const duration = Date.now() - startTime;
        
        apiMonitor.logRequest({
            path: req.path,
            method: req.method,
            duration,
            status: res.statusCode,
            remainingRequests: parseInt(res.getHeader('X-RateLimit-Remaining') || '0'),
            totalRequests: parseInt(res.getHeader('X-RateLimit-Limit') || '100')
        });
        
        originalEnd.apply(res, args);
    };
    
    next();
});

// Error monitoring
router.use((error, req, res, next) => {
    apiMonitor.logError({
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack
    });
    next(error);
});

// Metrics endpoint
router.get('/metrics', (req, res) => {
    res.json(apiMonitor.getMetrics());
});

module.exports = { router, apiMonitor };