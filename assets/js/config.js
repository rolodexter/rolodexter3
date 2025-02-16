// Constants that don't depend on runtime
const CONFIG_DEFAULTS = {
    paths: {
        index: 'assets/data/index.json',
        graphData: 'assets/data/graph-data.json',
        backupData: 'assets/data/graph-data.backup.json'
    },
    githubPages: {
        owner: 'rolodexter',
        repo: 'rolodexter3',
        branch: 'gh-pages-data',
        autoDetectRepo: true
    },
    debug: {
        enabled: false, // Default to false for production
        logLevel: 'warn', // Default to warnings only
        logToConsole: true,
        logToUI: false, // Default UI logging off
        logPathResolution: false,
        logCacheOperations: false,
        validatePaths: true,
        showDebugControls: false // New setting for debug controls visibility
    }
};

// Fallback values for safety
const FALLBACK_CONFIG = {
    environment: {
        mode: 'local',
        basePath: '/',
    },
    debug: {
        enabled: true,
        logLevel: 'debug'
    }
};

let configInstance = null;

class Config {
    constructor() {
        if (configInstance) {
            return configInstance;
        }

        try {
            this.initialize();
        } catch (error) {
            console.warn('[Config] Initialization failed, using fallback configuration:', error);
            this.initializeFallback();
        }

        configInstance = this;
        return this;
    }

    initialize() {
        // Initialize with defaults
        Object.assign(this, CONFIG_DEFAULTS);

        this.environment = {
            mode: 'local',
            forceMode: null,
            basePath: null,
            debug: {
                showEnvironmentInfo: true,
                showPathResolution: true
            }
        };

        this.cache = {
            enabled: true,
            version: null,
            forceRefresh: false,
            debug: {
                showCacheOperations: true,
                showExpiry: true
            }
        };

        // Load any stored debug preferences
        this.loadDebugPreferences();

        // Detect environment after initialization
        try {
            this.environment.mode = this.detectEnvironment();
            
            if (this.debug.enabled) {
                console.debug('[Config] Initialized with mode:', this.environment.mode);
            }
        } catch (error) {
            console.warn('[Config] Environment detection failed:', error);
            this.environment.mode = FALLBACK_CONFIG.environment.mode;
        }

        // Initialize debug controls if enabled
        if (this.debug.showDebugControls) {
            this.initializeDebugControls();
        }
    }

    initializeFallback() {
        Object.assign(this, FALLBACK_CONFIG);
        console.warn('[Config] Running in fallback mode');
    }

    loadDebugPreferences() {
        try {
            const storedDebug = localStorage.getItem('debug_preferences');
            if (storedDebug) {
                const preferences = JSON.parse(storedDebug);
                Object.assign(this.debug, preferences);
            }
        } catch (error) {
            console.warn('[Config] Failed to load debug preferences:', error);
        }
    }

    saveDebugPreferences() {
        try {
            localStorage.setItem('debug_preferences', JSON.stringify(this.debug));
        } catch (error) {
            console.warn('[Config] Failed to save debug preferences:', error);
        }
    }

    detectEnvironment() {
        if (typeof window === 'undefined') return 'local';
        
        try {
            const hostname = window.location.hostname;
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
            const isGitHubPages = hostname.endsWith('github.io');
            const isCustomDomain = !isLocalhost && !isGitHubPages;
            
            if (this.debug.enabled) {
                console.debug('[Config] Environment detection:', {
                    hostname,
                    isLocalhost,
                    isGitHubPages,
                    isCustomDomain
                });
            }
            
            if (isLocalhost) return 'local';
            if (isGitHubPages) return 'github-pages';
            if (isCustomDomain) return 'custom-domain';
            return 'unknown';
        } catch (error) {
            console.warn('[Config] Environment detection failed:', error);
            return FALLBACK_CONFIG.environment.mode;
        }
    }

    getBasePath() {
        if (this.environment.basePath) {
            return this.environment.basePath;
        }

        try {
            const mode = this.environment.forceMode || this.environment.mode;
            let basePath;
            
            switch (mode) {
                case 'github-pages':
                    basePath = this.resolveGitHubPagesPath();
                    break;
                case 'custom-domain':
                    basePath = this.resolveCustomDomainPath();
                    break;
                case 'local':
                    basePath = this.resolveLocalPath();
                    break;
                default:
                    basePath = this.resolveFallbackPath();
            }

            this.environment.basePath = basePath;
            
            if (this.debug.logPathResolution) {
                console.debug('[Config] Resolved base path:', {
                    mode,
                    basePath,
                    origin: window.location.origin
                });
            }

            return basePath;
        } catch (error) {
            console.warn('[Config] Base path resolution failed:', error);
            return FALLBACK_CONFIG.environment.basePath;
        }
    }

    // Helper functions for path resolution
    resolveGitHubPagesPath() {
        if (this.githubPages.autoDetectRepo) {
            const pathSegments = window.location.pathname.split('/');
            const repoPath = pathSegments
                .filter(segment => segment && !segment.includes('.'))
                .join('/');
            return `${window.location.origin}/${repoPath}`;
        }
        return `${window.location.origin}/${this.githubPages.owner}/${this.githubPages.repo}`;
    }

    resolveCustomDomainPath() {
        const pathname = window.location.pathname;
        const lastSlashIndex = pathname.lastIndexOf('/');
        return window.location.origin + (lastSlashIndex > 0 ? pathname.substring(0, lastSlashIndex) : '');
    }

    resolveLocalPath() {
        const baseDir = window.location.pathname.split('/')[1];
        return baseDir ? `${window.location.origin}/${baseDir}` : window.location.origin;
    }

    resolveFallbackPath() {
        const pathname = window.location.pathname;
        const lastSlashIndex = pathname.lastIndexOf('/');
        return window.location.origin + (lastSlashIndex > 0 ? pathname.substring(0, lastSlashIndex) : '');
    }

    async validateBasePath(basePath) {
        try {
            // Try to fetch the index file to validate the base path
            const indexUrl = `${basePath}/${this.paths.index}`;
            const graphDataUrl = `${basePath}/${this.paths.graphData}`;
            
            // Check both HTTP and HTTPS if needed
            const urls = [indexUrl];
            if (window.location.protocol === 'https:' && basePath.startsWith('http:')) {
                urls.push(indexUrl.replace('http:', 'https:'));
            }
            
            // Try all possible URLs
            for (const url of urls) {
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                    if (response.ok) {
                        console.debug('[Config] Base Path Validation', 'Successfully validated base path', {
                            basePath,
                            url,
                            status: response.status
                        });
                        return true;
                    }
                } catch (error) {
                    console.debug('[Config] Base Path Validation', `Failed to validate URL: ${url}`, {
                        error: error.message
                    });
                }
            }
            
            // Check if graph data exists
            const graphDataResponse = await fetch(graphDataUrl, { method: 'HEAD' });
            if (!graphDataResponse.ok) {
                console.debug('[Config] Base Path Validation', 'Warning: graph-data.json not found', {
                    url: graphDataUrl,
                    status: graphDataResponse.status
                });
                
                // Show warning banner for missing data files
                this.showMissingDataWarning(graphDataUrl);
            }
            
            throw new Error(`Failed to validate base path: No valid URLs found`);
        } catch (error) {
            console.debug('[Config] Base Path Validation', 'Failed to validate base path', {
                basePath,
                error: error.message
            });
            return false;
        }
    }

    showMissingDataWarning(url) {
        const warningContainer = document.createElement('div');
        warningContainer.className = 'missing-data-warning';
        warningContainer.innerHTML = `
            <div class="warning-content">
                <h3>⚠️ Missing Data Files</h3>
                <p>The graph data files could not be found at the expected location.</p>
                <p>Expected URL: <code>${url}</code></p>
                <div class="warning-actions">
                    <button onclick="window.location.reload()">Refresh Page</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.getElementById('missing-data-warning-styles')) {
            const style = document.createElement('style');
            style.id = 'missing-data-warning-styles';
            style.textContent = `
                .missing-data-warning {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--warning-bg, #fff3cd);
                    border: 1px solid var(--warning-border, #ffeeba);
                    border-radius: 8px;
                    padding: 1rem;
                    z-index: 1000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    max-width: 90%;
                    width: 500px;
                }
                
                .warning-content {
                    text-align: center;
                }
                
                .warning-content h3 {
                    margin: 0 0 1rem;
                    color: var(--warning-text, #856404);
                }
                
                .warning-content code {
                    display: block;
                    background: rgba(0,0,0,0.05);
                    padding: 0.5rem;
                    margin: 0.5rem 0;
                    border-radius: 4px;
                    word-break: break-all;
                }
                
                .warning-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 1rem;
                }
                
                .warning-actions button {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: var(--primary-color, #4a90e2);
                    color: white;
                }
                
                .warning-actions button:last-child {
                    background: var(--secondary-color, #6c757d);
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(warningContainer);
    }

    setEnvironmentMode(mode) {
        if (mode !== 'github-pages' && mode !== 'local' && mode !== 'custom-domain') {
            console.warn(`[Config] Invalid environment mode: ${mode}, using current mode`);
            return;
        }
        
        try {
            this.environment.forceMode = mode;
            this.environment.basePath = null; // Reset basePath to force recalculation
            
            if (this.debug.enabled) {
                console.debug('[Config] Environment mode set:', mode);
            }
        } catch (error) {
            console.error('[Config] Failed to set environment mode:', error);
        }
    }

    enableDebug(options = {}) {
        try {
            Object.assign(this.debug, options);
            this.debug.enabled = true;
            
            // Save debug preferences
            this.saveDebugPreferences();
            
            if (this.debug.enabled) {
                console.debug('[Config] Debug enabled with options:', options);
            }

            // Initialize debug controls if not already present
            if (this.debug.showDebugControls) {
                this.initializeDebugControls();
            }
        } catch (error) {
            console.warn('[Config] Failed to enable debug mode:', error);
        }
    }

    initializeDebugControls() {
        if (document.getElementById('debug-controls')) return;

        const controls = document.createElement('div');
        controls.id = 'debug-controls';
        controls.innerHTML = `
            <style>
                #debug-controls {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 12px;
                    z-index: 10000;
                }

                #debug-controls.minimized {
                    width: 30px;
                    height: 30px;
                    overflow: hidden;
                    cursor: pointer;
                }

                #debug-controls .control-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                #debug-controls .control-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                #debug-controls label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                @media (max-width: 768px) {
                    #debug-controls {
                        bottom: 10px;
                        right: 10px;
                        max-width: calc(100% - 20px);
                    }
                }
            </style>
            <div class="control-header">
                <span>Debug Controls</span>
                <button onclick="this.parentElement.parentElement.classList.toggle('minimized')">≡</button>
            </div>
            <div class="control-content">
                <label>
                    <input type="checkbox" ${this.debug.enabled ? 'checked' : ''} onchange="window.configInstance.toggleDebug(this.checked)">
                    Enable Debug Mode
                </label>
                <label>
                    <input type="checkbox" ${this.debug.logToConsole ? 'checked' : ''} onchange="window.configInstance.toggleConsoleLog(this.checked)">
                    Console Logging
                </label>
                <label>
                    <input type="checkbox" ${this.debug.logToUI ? 'checked' : ''} onchange="window.configInstance.toggleUILog(this.checked)">
                    UI Logging
                </label>
            </div>
        `;

        document.body.appendChild(controls);

        // Expose methods for the UI
        window.configInstance = this;
    }

    toggleDebug(enabled) {
        this.debug.enabled = enabled;
        this.saveDebugPreferences();
    }

    toggleConsoleLog(enabled) {
        this.debug.logToConsole = enabled;
        this.saveDebugPreferences();
    }

    toggleUILog(enabled) {
        this.debug.logToUI = enabled;
        this.saveDebugPreferences();
    }
}

// Export singleton instance
export const config = new Config();

// Export utility functions that use the singleton
export function setEnvironmentMode(mode) {
    config.setEnvironmentMode(mode);
}

export function enableDebug(options = {}) {
    config.enableDebug(options);
}

export function getBasePath() {
    return config.getBasePath();
}

// Debug logging utility
export function debugLog(category, message, data = null) {
    if (!config.debug.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${category}] ${typeof message === 'object' ? 'Debug Info:' : message}`;
    
    if (config.debug.logToConsole) {
        if (typeof message === 'object') {
            console.debug(logMessage, message);
        } else {
            console.debug(logMessage);
            if (data) console.debug(data);
        }
    }
    
    if (config.debug.logToUI) {
        appendToDebugUI(category, message, data);
    }
}

// UI Debug logging
function appendToDebugUI(category, message, data) {
    const debugContainer = document.getElementById('debug-log-container') || createDebugUI();
    if (!debugContainer) return;

    const entry = document.createElement('div');
    entry.className = 'debug-log-entry';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'debug-timestamp';
    timestamp.textContent = new Date().toISOString();
    
    const categorySpan = document.createElement('span');
    categorySpan.className = 'debug-category';
    categorySpan.textContent = `[${category}]`;
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'debug-message';
    
    if (typeof message === 'object') {
        messageSpan.textContent = 'Debug Info:';
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(message, null, 2);
        entry.appendChild(pre);
    } else {
        messageSpan.textContent = message;
        if (data) {
            const pre = document.createElement('pre');
            pre.textContent = JSON.stringify(data, null, 2);
            entry.appendChild(pre);
        }
    }
    
    entry.appendChild(timestamp);
    entry.appendChild(categorySpan);
    entry.appendChild(messageSpan);
    
    debugContainer.appendChild(entry);
    debugContainer.scrollTop = debugContainer.scrollHeight;
    
    // Keep only last 100 entries
    while (debugContainer.children.length > 100) {
        debugContainer.removeChild(debugContainer.firstChild);
    }
}

function createDebugUI() {
    const container = document.createElement('div');
    container.id = 'debug-log-container';
    
    // Add styles if not already present
    if (!document.getElementById('debug-log-styles')) {
        const style = document.createElement('style');
        style.id = 'debug-log-styles';
        style.textContent = `
            #debug-log-container {
                position: fixed;
                bottom: 0;
                right: 0;
                width: 400px;
                height: 300px;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: monospace;
                font-size: 12px;
                padding: 10px;
                overflow-y: auto;
                z-index: 9999;
                display: none;
            }
            
            #debug-log-container.visible {
                display: block;
            }
            
            .debug-log-entry {
                margin-bottom: 5px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 5px;
            }
            
            .debug-timestamp {
                color: #888;
                margin-right: 8px;
            }
            
            .debug-category {
                color: #4a9eff;
                margin-right: 8px;
            }
            
            .debug-message {
                color: #fff;
            }
            
            .debug-log-entry pre {
                margin: 5px 0;
                padding: 5px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow-x: auto;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(container);
    
    // Add toggle button
    const toggle = document.createElement('button');
    toggle.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 10000;
        padding: 5px 10px;
        background: #4a9eff;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
    `;
    toggle.textContent = 'Toggle Debug Log';
    toggle.onclick = () => container.classList.toggle('visible');
    document.body.appendChild(toggle);
    
    return container;
} 