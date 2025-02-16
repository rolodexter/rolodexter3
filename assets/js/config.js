export const config = {
    // Environment detection with manual override support
    environment: {
        mode: detectEnvironment(),
        forceMode: null, // Can be set to 'github-pages' or 'local'
        basePath: null   // Can be manually set for custom deployments
    },

    // Cache settings
    cache: {
        enabled: true,
        version: null,   // Set from index.json version
        forceRefresh: false
    },

    // GitHub Pages specific settings
    githubPages: {
        owner: 'rolodexter',
        repo: 'rolodexter3',
        branch: 'gh-pages-data'
    },

    // Paths
    paths: {
        index: 'assets/data/index.json',
        graphData: 'assets/data/graph-data.json',
        backupData: 'assets/data/graph-data.backup.json'
    },

    // Debug settings
    debug: {
        enabled: false,
        logCacheOperations: false,
        logPathResolution: false
    }
};

function detectEnvironment() {
    if (typeof window === 'undefined') return 'local';
    
    const isGitHubPages = /\.github\.io$/.test(window.location.hostname);
    return isGitHubPages ? 'github-pages' : 'local';
}

export function setEnvironmentMode(mode) {
    if (mode !== 'github-pages' && mode !== 'local') {
        throw new Error('Invalid environment mode. Use "github-pages" or "local"');
    }
    config.environment.forceMode = mode;
}

export function enableDebug(options = {}) {
    config.debug = {
        ...config.debug,
        enabled: true,
        ...options
    };
}

export function getBasePath() {
    if (config.environment.basePath) {
        return config.environment.basePath;
    }

    const mode = config.environment.forceMode || config.environment.mode;
    
    if (mode === 'github-pages') {
        return `${window.location.origin}/${config.githubPages.repo}`;
    }
    
    return window.location.origin;
}

// Debug logging utility
export function debugLog(category, message, data = null) {
    if (!config.debug.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${category}] ${message}`;
    
    console.debug(logMessage);
    if (data) console.debug(data);
} 