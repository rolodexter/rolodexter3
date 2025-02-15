// Performance and Session Tracking System
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            navigation: new Map(),
            resources: new Map(),
            api: new Map(),
            memory: new Map()
        };
        this.thresholds = {
            responseTime: 1000,    // 1 second
            memoryUsage: 0.8,     // 80% of heap limit
            errorRate: 0.05       // 5% error rate
        };
        this.initialize();
    }

    initialize() {
        this.setupObservers();
        this.setupMemoryMonitoring();
        this.setupSessionTracking();
        this.monitorResourceUsage();
    }

    setupObservers() {
        // Performance monitoring
        this.observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                this.processPerformanceEntry(entry);
            });
        });

        this.observer.observe({
            entryTypes: ['navigation', 'resource', 'measure', 'longtask']
        });

        // Intersection observer for visibility tracking
        this.visibilityObserver = new IntersectionObserver(
            (entries) => this.handleVisibility(entries),
            { threshold: [0, 0.5, 1] }
        );
    }

    setupMemoryMonitoring() {
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
                
                this.metrics.memory.set('heapUsage', {
                    timestamp: Date.now(),
                    usage,
                    total: memory.totalJSHeapSize,
                    used: memory.usedJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                });

                if (usage > this.thresholds.memoryUsage) {
                    this.logWarning('High memory usage detected', { usage });
                }
            }, 30000); // Check every 30 seconds
        }
    }

    setupSessionTracking() {
        window.addEventListener('visibilitychange', () => {
            this.logSessionEvent({
                type: document.visibilityState,
                timestamp: Date.now()
            });
        });

        window.addEventListener('pagehide', () => {
            this.logSessionEvent({
                type: 'pagehide',
                timestamp: Date.now()
            });
        });

        window.addEventListener('pageshow', () => {
            this.logSessionEvent({
                type: 'pageshow',
                timestamp: Date.now()
            });
        });
    }

    monitorResourceUsage() {
        // Resource timing data collection
        const processResource = (entry) => {
            if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                this.metrics.api.set(entry.name, {
                    duration: entry.duration,
                    startTime: entry.startTime,
                    transferSize: entry.transferSize,
                    timestamp: Date.now()
                });
            } else {
                this.metrics.resources.set(entry.name, {
                    type: entry.initiatorType,
                    duration: entry.duration,
                    size: entry.transferSize,
                    timestamp: Date.now()
                });
            }
        };

        const resourceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(processResource);
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
    }

    processPerformanceEntry(entry) {
        const metric = {
            type: entry.entryType,
            name: entry.name,
            duration: entry.duration,
            timestamp: Date.now()
        };

        switch (entry.entryType) {
            case 'navigation':
                this.metrics.navigation.set('pageLoad', {
                    ...metric,
                    domComplete: entry.domComplete,
                    domInteractive: entry.domInteractive,
                    loadEventEnd: entry.loadEventEnd
                });
                break;
            case 'longtask':
                this.handleLongTask(entry);
                break;
            case 'measure':
                this.metrics.navigation.set(entry.name, metric);
                break;
        }

        this.logMetric(metric);
    }

    handleLongTask(entry) {
        this.logWarning('Long task detected', {
            duration: entry.duration,
            name: entry.name,
            startTime: entry.startTime
        });
    }

    handleVisibility(entries) {
        entries.forEach(entry => {
            this.metrics.navigation.set(`visibility_${entry.target.id}`, {
                ratio: entry.intersectionRatio,
                timestamp: Date.now(),
                isVisible: entry.isIntersecting
            });
        });
    }

    async logMetric(metric) {
        try {
            await fetch('/api/monitor/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metric)
            });
        } catch (error) {
            console.error('Failed to log metric:', error);
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

    getMetrics() {
        return {
            navigation: Object.fromEntries(this.metrics.navigation),
            resources: Object.fromEntries(this.metrics.resources),
            api: Object.fromEntries(this.metrics.api),
            memory: Object.fromEntries(this.metrics.memory),
            timestamp: Date.now()
        };
    }

    cleanup() {
        this.observer.disconnect();
        this.visibilityObserver.disconnect();
    }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

// Export for use in other modules
export { performanceMonitor };