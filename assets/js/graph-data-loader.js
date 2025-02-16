import { config, debugLog } from './config.js';
import { PathResolver } from './path-resolver.js';

export class GraphDataLoader {
    constructor() {
        this.pathResolver = new PathResolver();
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    async loadDirectory() {
        try {
            // First try to load from local data directory
            debugLog('GraphDataLoader', 'Attempting to load from local data directory');
            const data = await this.loadGraphData();
            if (data) {
                return data;
            }

            // If local data fails, try fallback data
            debugLog('GraphDataLoader', 'Local data not found, attempting to load fallback data');
            const fallbackData = await this.loadFallbackData();
            if (fallbackData) {
                return fallbackData;
            }

            throw new Error('No graph data available');
        } catch (error) {
            this.logError('Error loading graph data:', error);

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.logWarning(`Retrying data load (${this.retryCount}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.loadDirectory();
            }

            // Create a minimal fallback dataset if all attempts fail
            return this.createMinimalFallback();
        }
    }

    async loadGraphData() {
        try {
            const graphDataPath = this.pathResolver.resolvePath(config.paths.graphData);
            debugLog('GraphDataLoader', `Loading graph data from: ${graphDataPath}`);
            
            const response = await fetch(graphDataPath);
            if (!response.ok) {
                throw new Error(`Failed to load graph data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            debugLog('GraphDataLoader', 'Successfully loaded graph data');
            return data;
        } catch (error) {
            this.logWarning('Failed to load primary graph data:', error);
            return null;
        }
    }

    async loadFallbackData() {
        try {
            const indexPath = this.pathResolver.resolvePath(config.paths.index);
            debugLog('GraphDataLoader', `Loading fallback data from: ${indexPath}`);
            
            const response = await fetch(indexPath);
            if (!response.ok) {
                throw new Error('Failed to fetch index');
            }
            
            const data = await response.json();
            debugLog('GraphDataLoader', 'Successfully loaded fallback data');
            return data;
        } catch (error) {
            this.logWarning('Failed to load fallback data:', error);
            return null;
        }
    }

    createMinimalFallback() {
        debugLog('GraphDataLoader', 'Creating minimal fallback dataset');
        return {
            nodes: [
                {
                    id: 'root',
                    label: 'Knowledge Graph',
                    type: 'root',
                    metadata: {
                        description: 'Root node of the knowledge graph',
                        created: new Date().toISOString(),
                        status: 'generated'
                    }
                }
            ],
            edges: [],
            metadata: {
                generated: true,
                timestamp: new Date().toISOString(),
                message: 'Minimal fallback dataset generated due to data loading failure'
            }
        };
    }

    logError(message, error) {
        console.error(`[GraphDataLoader] ${message}`, error);
        debugLog('GraphDataLoader', message, { error: error.message, stack: error.stack });
    }

    logWarning(message, error = null) {
        console.warn(`[GraphDataLoader] ${message}`, error);
        debugLog('GraphDataLoader', message, error ? { error: error.message } : null);
    }
} 