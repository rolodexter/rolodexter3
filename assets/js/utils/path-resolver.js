export class PathResolver {
    constructor(options = {}) {
        this.baseUrl = this.detectBaseUrl();
        this.indexPath = options.indexPath || 'assets/data/index.json';
        this.graphDataPath = options.graphDataPath || 'assets/data/graph-data.json';
    }

    detectBaseUrl() {
        if (typeof window === 'undefined') return '';
        
        const ghPages = /\.github\.io$/;
        if (ghPages.test(window.location.hostname)) {
            return `${window.location.origin}/${window.location.pathname.split('/')[1]}`;
        }
        return window.location.origin;
    }

    resolvePath(path) {
        // Remove leading/trailing slashes and normalize
        const normalizedPath = path.replace(/^\/+|\/+$/g, '');
        return `${this.baseUrl}/${normalizedPath}`.replace(/\/+/g, '/');
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
        return absolutePath.replace(this.baseUrl, '').replace(/^\/+/, '');
    }

    joinPaths(...parts) {
        return parts.map(part => part.replace(/^\/+|\/+$/g, '')).join('/');
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

            return current || null;
        } catch (error) {
            console.error('Failed to resolve path in index:', path, error);
            return null;
        }
    }

    async fetchIndex() {
        const response = await fetch(this.resolveIndexPath());
        if (!response.ok) throw new Error('Failed to fetch index');
        return await response.json();
    }
} 