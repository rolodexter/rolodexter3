import { config, debugLog, getBasePath } from './config.js';

export class PathResolver {
    constructor() {
        this.basePath = null;
    }

    resolvePath(relativePath) {
        // Get the base path if not already cached
        if (!this.basePath) {
            this.basePath = getBasePath();
        }

        // Clean up the relative path
        const cleanPath = this.cleanPath(relativePath);

        // Construct the full URL
        const fullPath = this.joinPaths(this.basePath, cleanPath);

        if (config.debug.logPathResolution) {
            debugLog('PathResolver', 'Path Resolution', {
                relativePath,
                cleanPath,
                basePath: this.basePath,
                fullPath
            });
        }

        return fullPath;
    }

    cleanPath(path) {
        // Remove leading and trailing slashes
        return path.replace(/^\/+|\/+$/g, '');
    }

    joinPaths(...parts) {
        // Filter out empty parts and join with forward slashes
        return parts
            .map(part => this.cleanPath(part))
            .filter(Boolean)
            .join('/');
    }

    async fetchIndex() {
        try {
            const indexPath = this.resolvePath(config.paths.index);
            debugLog('PathResolver', `Fetching index from: ${indexPath}`);

            const response = await fetch(indexPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch index: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            debugLog('PathResolver', 'Successfully fetched index');
            return data;
        } catch (error) {
            debugLog('PathResolver', 'Error fetching index', { error: error.message });
            throw error;
        }
    }

    getLocalDataPath() {
        return this.resolvePath(config.paths.graphData);
    }

    getFallbackDataPath() {
        return this.resolvePath(config.paths.backupData);
    }

    isLocalPath(path) {
        return path.startsWith(window.location.origin);
    }

    getRelativePath(absolutePath) {
        if (!absolutePath.startsWith(this.basePath)) {
            return absolutePath;
        }
        return absolutePath.slice(this.basePath.length).replace(/^\/+/, '');
    }
} 