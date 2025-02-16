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
        this.isGitHubPages = window.location.hostname.includes('github.io');
        this.observers = [];
        this.initialized = false;
        this.sessionId = crypto.randomUUID();
        this.lastCleanup = Date.now();
        this.cleanupInterval = 1000 * 60 * 60; // 1 hour
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
            const data = {
                ...metric,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId
            };

            if (this.isGitHubPages) {
                this.storeLocally('metric', data);
                console.debug('[PerformanceMonitor] Metric stored locally:', data);
            } else {
                const response = await fetch('/api/monitor/performance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
        } catch (error) {
            console.debug('[PerformanceMonitor] Metric logging failed, storing locally:', error);
            this.storeLocally('metric', metric);
        }
    }

    async logSessionEvent(event) {
        try {
            const data = {
                event,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId
            };

            if (this.isGitHubPages) {
                this.storeLocally('session', data);
                console.debug('[PerformanceMonitor] Session event stored locally:', data);
            } else {
                const response = await fetch('/api/monitor/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
        } catch (error) {
            console.debug('[PerformanceMonitor] Session logging failed, storing locally:', error);
            this.storeLocally('session', event);
        }
    }

    storeLocally(type, data) {
        try {
            const key = type === 'metric' ? 'performanceMetrics' : 'sessionEvents';
            const maxItems = type === 'metric' ? 100 : 50;
            
            // Get stored items with error handling
            let stored = [];
            try {
                stored = JSON.parse(localStorage.getItem(key) || '[]');
                if (!Array.isArray(stored)) stored = [];
            } catch (e) {
                console.debug(`[PerformanceMonitor] Error parsing ${key}, resetting:`, e);
                stored = [];
            }

            // Add new item with proper timestamp and session ID
            stored.push({
                ...data,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId
            });

            // Keep only the most recent items
            if (stored.length > maxItems) {
                stored = stored.slice(-maxItems);
            }

            // Check storage quota before saving
            const storageData = JSON.stringify(stored);
            if (storageData.length * 2 > 5242880) { // 5MB limit
                stored = stored.slice(-Math.floor(maxItems / 2)); // Reduce by half if near limit
                console.debug(`[PerformanceMonitor] Storage quota near limit, reducing ${key} items`);
            }

            localStorage.setItem(key, JSON.stringify(stored));

            // Cleanup old data if needed
            const now = Date.now();
            if (now - this.lastCleanup > this.cleanupInterval) {
                this.cleanupStorage();
                this.lastCleanup = now;
            }
        } catch (error) {
            console.debug(`[PerformanceMonitor] Local storage failed for ${type}:`, error);
            // If storage fails, try to clear old data
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.debug('[PerformanceMonitor] Failed to clear storage:', e);
            }
        }
    }

    cleanupStorage() {
        try {
            // Keep only last 24 hours of data
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            ['performanceMetrics', 'sessionEvents'].forEach(key => {
                try {
                    const stored = JSON.parse(localStorage.getItem(key) || '[]');
                    if (!Array.isArray(stored)) {
                        localStorage.setItem(key, '[]');
                        return;
                    }
                    const filtered = stored.filter(item => item.timestamp >= cutoff);
                    localStorage.setItem(key, JSON.stringify(filtered));
                } catch (e) {
                    console.debug(`[PerformanceMonitor] Error cleaning up ${key}:`, e);
                    localStorage.setItem(key, '[]');
                }
            });
        } catch (error) {
            console.debug('[PerformanceMonitor] Storage cleanup failed:', error);
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