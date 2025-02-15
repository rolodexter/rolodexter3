// Session & Performance Monitoring
class PerformanceTracker {
    constructor() {
        this.metrics = {
            auth: new Map(),
            media: new Map(),
            api: new Map()
        };
        this.warningThresholds = {
            responseTime: 1000, // 1 second
            errorRate: 0.05,    // 5%
            memoryUsage: 0.8    // 80%
        };
        this.setupMonitoring();
    }

    setupMonitoring() {
        // Performance monitoring
        this.observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                this.logMetric(entry);
            });
        });

        this.observer.observe({ 
            entryTypes: ['measure', 'resource', 'navigation'] 
        });

        // Memory monitoring
        if (performance.memory) {
            setInterval(() => {
                this.checkMemoryUsage();
            }, 30000);
        }

        // Session monitoring
        window.addEventListener('visibilitychange', () => {
            this.logSessionEvent({
                type: document.visibilityState,
                timestamp: Date.now()
            });
        });
    }

    async logMetric(entry) {
        const metric = {
            type: entry.entryType,
            name: entry.name,
            duration: entry.duration,
            timestamp: Date.now()
        };

        await fetch('/api/monitor/performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metric)
        });
    }

    checkMemoryUsage() {
        if (performance.memory) {
            const usage = performance.memory.usedJSHeapSize / 
                         performance.memory.jsHeapSizeLimit;

            if (usage > this.warningThresholds.memoryUsage) {
                this.logWarning('High memory usage detected', { usage });
            }
        }
    }

    async logSessionEvent(event) {
        try {
            await fetch('/api/monitor/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
        } catch (error) {
            console.error('Failed to log session event:', error);
        }
    }

    logWarning(message, data) {
        console.warn(message, data);
        this.logSessionEvent({
            type: 'warning',
            message,
            data,
            timestamp: Date.now()
        });
    }
}

// Initialize performance tracking
const performanceTracker = new PerformanceTracker();

// Export for use in other modules
export { performanceTracker };