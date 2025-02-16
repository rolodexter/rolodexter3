// Initialize base config first
const defaultConfig = {
    // Environment detection with manual override support
    environment: {
        mode: 'local', // Default to local, will be updated after detection
        forceMode: null,
        basePath: null,
        debug: {
            showEnvironmentInfo: true,
            showPathResolution: true
        }
    },

    // Cache settings
    cache: {
        enabled: true,
        version: null,
        forceRefresh: false,
        debug: {
            showCacheOperations: true,
            showExpiry: true
        }
    },

    // GitHub Pages specific settings
    githubPages: {
        owner: 'rolodexter',
        repo: 'rolodexter3',
        branch: 'gh-pages-data',
        autoDetectRepo: true
    },

    // Paths (relative to base path)
    paths: {
        index: 'assets/data/index.json',
        graphData: 'assets/data/graph-data.json',
        backupData: 'assets/data/graph-data.backup.json'
    },

    // Debug settings
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

// Export the config object
export const config = defaultConfig;

// Environment detection function
function detectEnvironment() {
    if (typeof window === 'undefined') return 'local';
    
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isGitHubPages = hostname.endsWith('github.io');
    const isCustomDomain = !isLocalhost && !isGitHubPages;
    const isWWW = hostname.startsWith('www.');
    const baseHostname = isWWW ? hostname.substring(4) : hostname;
    
    if (config.debug.showEnvironmentInfo) {
        debugLog('Environment Detection', {
            hostname,
            baseHostname,
            isLocalhost,
            isGitHubPages,
            isCustomDomain,
            isWWW,
            protocol: window.location.protocol,
            pathname: window.location.pathname,
            origin: window.location.origin,
            href: window.location.href,
            userAgent: navigator.userAgent
        });
    }
    
    if (isLocalhost) return 'local';
    if (isGitHubPages) return 'github-pages';
    if (isCustomDomain) return 'custom-domain';
    return 'unknown';
}

// Initialize environment after config is created
config.environment.mode = detectEnvironment();

// Export utility functions
export function setEnvironmentMode(mode) {
    if (mode !== 'github-pages' && mode !== 'local' && mode !== 'custom-domain') {
        throw new Error('Invalid environment mode. Use "github-pages", "local", or "custom-domain"');
    }
    config.environment.forceMode = mode;
    debugLog('Environment', `Mode set to: ${mode}`);
}

export function enableDebug(options = {}) {
    config.debug = {
        ...config.debug,
        enabled: true,
        ...options
    };
    
    debugLog('Debug Mode', 'Enabled with options:', options);
}

export function getBasePath() {
    if (config.environment.basePath) {
        debugLog('Base Path', 'Using configured base path:', config.environment.basePath);
        return config.environment.basePath;
    }

    const mode = config.environment.forceMode || config.environment.mode;
    let basePath;
    
    switch (mode) {
        case 'github-pages':
            basePath = resolveGitHubPagesPath();
            break;
        case 'custom-domain':
            basePath = resolveCustomDomainPath();
            break;
        case 'local':
            basePath = resolveLocalPath();
            break;
        default:
            basePath = resolveFallbackPath();
    }

    // Cache the resolved base path
    config.environment.basePath = basePath;
    
    if (config.debug.logPathResolution) {
        debugLog('Base Path Resolution', {
            mode,
            resolved: basePath,
            origin: window.location.origin,
            pathname: window.location.pathname,
            fullUrl: new URL(basePath + '/').href
        });
    }

    // Validate the resolved path if enabled
    if (config.debug.validatePaths) {
        validateBasePath(basePath).catch(error => {
            debugLog('Base Path Validation', 'Warning: Base path validation failed', { error: error.message });
        });
    }
    
    return basePath;
}

// Helper functions for path resolution
function resolveGitHubPagesPath() {
    if (config.githubPages.autoDetectRepo) {
        const pathSegments = window.location.pathname.split('/');
        const repoPath = pathSegments
            .filter(segment => segment && !segment.includes('.'))
            .join('/');
        return `${window.location.origin}/${repoPath}`;
    }
    return `${window.location.origin}/${config.githubPages.owner}/${config.githubPages.repo}`;
}

function resolveCustomDomainPath() {
    const pathname = window.location.pathname;
    const lastSlashIndex = pathname.lastIndexOf('/');
    return window.location.origin + (lastSlashIndex > 0 ? pathname.substring(0, lastSlashIndex) : '');
}

function resolveLocalPath() {
    const baseDir = window.location.pathname.split('/')[1];
    return baseDir ? `${window.location.origin}/${baseDir}` : window.location.origin;
}

function resolveFallbackPath() {
    const pathname = window.location.pathname;
    const lastSlashIndex = pathname.lastIndexOf('/');
    return window.location.origin + (lastSlashIndex > 0 ? pathname.substring(0, lastSlashIndex) : '');
}

async function validateBasePath(basePath) {
    try {
        // Try to fetch the index file to validate the base path
        const indexUrl = `${basePath}/${config.paths.index}`;
        const graphDataUrl = `${basePath}/${config.paths.graphData}`;
        
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
                    debugLog('Base Path Validation', 'Successfully validated base path', {
                        basePath,
                        url,
                        status: response.status
                    });
                    return true;
                }
            } catch (error) {
                debugLog('Base Path Validation', `Failed to validate URL: ${url}`, {
                    error: error.message
                });
            }
        }
        
        // Check if graph data exists
        const graphDataResponse = await fetch(graphDataUrl, { method: 'HEAD' });
        if (!graphDataResponse.ok) {
            debugLog('Base Path Validation', 'Warning: graph-data.json not found', {
                url: graphDataUrl,
                status: graphDataResponse.status
            });
            
            // Show warning banner for missing data files
            showMissingDataWarning(graphDataUrl);
        }
        
        throw new Error(`Failed to validate base path: No valid URLs found`);
    } catch (error) {
        debugLog('Base Path Validation', 'Failed to validate base path', {
            basePath,
            error: error.message
        });
        return false;
    }
}

function showMissingDataWarning(url) {
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