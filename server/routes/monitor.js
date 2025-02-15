const { Router } = require('express');
const router = Router();

class MetricsCollector {
    constructor() {
        this.metrics = {
            apiCalls: 0,
            errors: 0,
            rateLimitRemaining: 100,
            averageResponseTime: 0,
            totalResponseTime: 0
        };
    }

    updateMetrics(data) {
        if (data.type === 'rateLimit') {
            this.metrics.rateLimitRemaining = data.remaining;
        } else {
            this.metrics.apiCalls++;
            this.metrics.totalResponseTime += data.duration;
            this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.apiCalls;
            
            if (data.type === 'error') {
                this.metrics.errors++;
            }
        }
    }

    getMetrics() {
        return this.metrics;
    }
}

const metricsCollector = new MetricsCollector();

router.post('/metrics', async (req, res) => {
    try {
        metricsCollector.updateMetrics(req.body);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Failed to update metrics:', error);
        res.status(500).json({ error: 'Failed to update metrics' });
    }
});

router.get('/status', (req, res) => {
    res.json(metricsCollector.getMetrics());
});

module.exports = router;