const express = require('express');
const router = express.Router();

// Health metrics storage
let healthMetrics = {
    apiResponses: [],
    errors: [],
    rateLimitHits: 0,
    totalRequests: 0,
    averageResponseTime: 0
};

// Monitor API response times
router.post('/metrics', async (req, res) => {
    try {
        const { responseTime, endpoint, status, error } = req.body;
        
        // Update metrics
        healthMetrics.totalRequests++;
        healthMetrics.apiResponses.push({
            timestamp: Date.now(),
            responseTime,
            endpoint,
            status
        });
        
        // Keep only last 100 responses
        if (healthMetrics.apiResponses.length > 100) {
            healthMetrics.apiResponses.shift();
        }
        
        // Calculate average response time
        healthMetrics.averageResponseTime = healthMetrics.apiResponses.reduce(
            (acc, curr) => acc + curr.responseTime, 0
        ) / healthMetrics.apiResponses.length;
        
        // Track errors if any
        if (error) {
            healthMetrics.errors.push({
                timestamp: Date.now(),
                error,
                endpoint
            });
            
            // Keep only last 50 errors
            if (healthMetrics.errors.length > 50) {
                healthMetrics.errors.shift();
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating metrics:', error);
        res.status(500).json({ error: 'Failed to update metrics' });
    }
});

// Get current health status
router.get('/status', (req, res) => {
    const status = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        metrics: {
            totalRequests: healthMetrics.totalRequests,
            averageResponseTime: healthMetrics.averageResponseTime.toFixed(2),
            recentErrors: healthMetrics.errors.slice(-5),
            rateLimitHits: healthMetrics.rateLimitHits
        }
    };
    
    res.json(status);
});

// Log debug information
router.post('/log', async (req, res) => {
    try {
        const { timestamp, error, retryCount } = req.body;
        const fs = require('fs').promises;
        const path = require('path');
        
        const logEntry = `
### ${timestamp}
- ⚠️ **Error:** ${error}
- 🔄 **Retry Count:** ${retryCount}
- 📊 **API Health:**
  - Avg Response Time: ${healthMetrics.averageResponseTime.toFixed(2)}ms
  - Recent Requests: ${healthMetrics.totalRequests}
  - Rate Limit Hits: ${healthMetrics.rateLimitHits}

`;
        
        await fs.appendFile(
            path.join(__dirname, '../../memory/rolodexterVS-debug.md'),
            logEntry
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error writing to debug log:', error);
        res.status(500).json({ error: 'Failed to write debug log' });
    }
});

module.exports = router;