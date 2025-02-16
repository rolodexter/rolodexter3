import { PathResolver } from './utils/path-resolver.js';

export class GraphDataLoader {
    constructor(options = {}) {
        this.nodes = new Map();
        this.edges = [];
        this.processedFiles = new Set();
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.isLoading = false;
        this.pathResolver = new PathResolver(options);
        this.cache = new Map();
        this.cacheExpiry = options.cacheExpiry || 5 * 60 * 1000; // 5 minutes
    }

    async loadDirectory() {
        try {
            this.isLoading = true;
            
            // Try to load from cache first
            const cachedData = this.getFromCache('graphData');
            if (cachedData) {
                return cachedData;
            }

            // Load the static graph data
            const data = await this.loadGraphData();
            if (!data) {
                // Try to load fallback data
                const fallbackData = await this.loadFallbackData();
                if (!fallbackData) {
                    throw new Error('No graph data available');
                }
                return this.processAndCacheData(fallbackData);
            }

            return this.processAndCacheData(data);
        } catch (error) {
            this.logError('Error loading graph data:', error);
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                this.logWarning(`Retrying data load (${this.retryAttempts}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.retryAttempts * 1000));
                return this.loadDirectory();
            }
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async loadGraphData() {
        try {
            const graphDataPath = this.pathResolver.resolveGraphDataPath();
            this.logDebug(`Loading graph data from: ${graphDataPath}`);
            
            const response = await fetch(graphDataPath);
            if (!response.ok) {
                throw new Error(`Failed to load graph data: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            this.logWarning('Failed to load primary graph data:', error);
            return null;
        }
    }

    async loadFallbackData() {
        try {
            const indexPath = this.pathResolver.resolveIndexPath();
            this.logDebug(`Loading fallback data from: ${indexPath}`);
            
            const response = await fetch(indexPath);
            if (!response.ok) {
                throw new Error(`Failed to load index: ${response.status} ${response.statusText}`);
            }
            
            const indexData = await response.json();
            return this.buildGraphFromIndex(indexData);
        } catch (error) {
            this.logWarning('Failed to load fallback data:', error);
            return null;
        }
    }

    buildGraphFromIndex(indexData) {
        const nodes = [];
        const edges = [];
        
        const processDirectory = (dir, path = '') => {
            if (dir.files) {
                Object.entries(dir.files).forEach(([filename, metadata]) => {
                    const filePath = this.pathResolver.joinPaths(path, filename);
                    nodes.push({
                        id: filePath,
                        name: metadata.title || filename,
                        metadata: {
                            ...metadata,
                            category: metadata.category || 'uncategorized'
                        }
                    });
                });
            }
            
            if (dir.directories) {
                dir.directories.forEach(subdir => {
                    const subdirPath = this.pathResolver.joinPaths(path, subdir);
                    if (dir[subdir]) {
                        processDirectory(dir[subdir], subdirPath);
                    }
                });
            }
        };

        processDirectory(indexData.structure);
        return { nodes, edges };
    }

    processAndCacheData(data) {
        // Process nodes
        this.nodes.clear();
        data.nodes.forEach(node => {
            this.nodes.set(node.id, node);
        });
        
        // Process edges
        this.edges = data.edges;
        
        const processedData = this.getGraphData();
        
        // Cache the processed data
        this.setCache('graphData', processedData);
        
        return processedData;
    }

    getGraphData() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges
        };
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    logError(message, error) {
        console.error(`[GraphDataLoader] ${message}`, error);
    }

    logWarning(message, data = '') {
        console.warn(`[GraphDataLoader] ${message}`, data);
    }

    logDebug(message, data = '') {
        if (config.debug.enabled) {
            console.debug(`[GraphDataLoader] ${message}`, data);
        }
    }

    reset() {
        this.nodes.clear();
        this.edges = [];
        this.processedFiles.clear();
        this.retryAttempts = 0;
        this.isLoading = false;
        this.cache.clear();
    }
} 