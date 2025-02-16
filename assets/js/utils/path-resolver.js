import { config, debugLog, getBasePath } from '../config.js';

export class PathResolver {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || getBasePath();
        this.indexPath = options.indexPath || config.paths.index;
        this.graphDataPath = options.graphDataPath || config.paths.graphData;
        
        if (config.debug.logPathResolution) {
            debugLog('PathResolver', 'Initialized with:', {
                baseUrl: this.baseUrl,
                indexPath: this.indexPath,
                graphDataPath: this.graphDataPath
            });
        }
    }

    resolvePath(path) {
        // Remove leading/trailing slashes and normalize
        const normalizedPath = path.replace(/^\/+|\/+$/g, '');
        const resolvedPath = `${this.baseUrl}/${normalizedPath}`.replace(/\/+/g, '/');
        
        if (config.debug.logPathResolution) {
            debugLog('PathResolver', `Resolved path: ${path} → ${resolvedPath}`);
        }
        
        return resolvedPath;
    }

    resolveIndexPath() {
        return this.resolvePath(this.indexPath);
    }

    resolveGraphDataPath() {
        return this.resolvePath(this.graphDataPath);
    }

    resolveFilePath(path) {
        return this.resolvePath(path);
    }

    getRelativePath(absolutePath) {
        const relativePath = absolutePath.replace(this.baseUrl, '').replace(/^\/+/, '');
        
        if (config.debug.logPathResolution) {
            debugLog('PathResolver', `Converted absolute to relative: ${absolutePath} → ${relativePath}`);
        }
        
        return relativePath;
    }

    joinPaths(...parts) {
        const joined = parts.map(part => part.replace(/^\/+|\/+$/g, '')).join('/');
        
        if (config.debug.logPathResolution) {
            debugLog('PathResolver', `Joined paths: ${parts.join(', ')} → ${joined}`);
        }
        
        return joined;
    }

    // Navigate the index.json structure to find a specific path
    async resolveInIndex(path) {
        try {
            const indexData = await this.fetchIndex();
            const parts = this.getRelativePath(path).split('/');
            let current = indexData.structure;

            for (const part of parts) {
                if (!current) return null;
                current = current[part];
            }

            if (config.debug.logPathResolution) {
                debugLog('PathResolver', `Index resolution for ${path}:`, current);
            }

            return current || null;
        } catch (error) {
            console.error('Failed to resolve path in index:', path, error);
            return null;
        }
    }

    async fetchIndex() {
        const response = await fetch(this.resolveIndexPath());
        if (!response.ok) throw new Error('Failed to fetch index');
        
        const data = await response.json();
        
        // Update cache version from index
        if (data.version) {
            config.cache.version = data.version;
            
            if (config.debug.logCacheOperations) {
                debugLog('Cache', `Updated version from index: ${data.version}`);
            }
        }
        
        return data;
    }
} 