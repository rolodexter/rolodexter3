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
        enabled: true,
        logLevel: 'debug',
        logToConsole: true,
        logToUI: true,
        logPathResolution: true,
        logCacheOperations: true,
        validatePaths: true
    }
};

// Runtime configuration singleton
let configInstance = null;

class Config {
    constructor() {
        if (configInstance) {
            return configInstance;
        }

        this.initialize();
        configInstance = this;
        return this;
    }

    initialize() {
        // Initialize with defaults
        Object.assign(this, CONFIG_DEFAULTS);

        // Add runtime-dependent properties
        this.environment = {
            mode: 'local', // Will be updated by detectEnvironment
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

        // Detect environment after initialization
        this.environment.mode = this.detectEnvironment();
        
        if (this.debug.enabled) {
            console.debug('[Config] Initialized with mode:', this.environment.mode);
        }
    }

    detectEnvironment() {
        if (typeof window === 'undefined') return 'local';
        
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
    }

    getBasePath() {
        if (this.environment.basePath) {
            return this.environment.basePath;
        }

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
    }

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

    setEnvironmentMode(mode) {
        if (mode !== 'github-pages' && mode !== 'local' && mode !== 'custom-domain') {
            throw new Error('Invalid environment mode. Use "github-pages", "local", or "custom-domain"');
        }
        this.environment.forceMode = mode;
        this.environment.basePath = null; // Reset basePath to force recalculation
        
        if (this.debug.enabled) {
            console.debug('[Config] Environment mode set:', mode);
        }
    }

    enableDebug(options = {}) {
        Object.assign(this.debug, options);
        this.debug.enabled = true;
        
        if (this.debug.enabled) {
            console.debug('[Config] Debug enabled with options:', options);
        }
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