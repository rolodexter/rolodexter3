export class GraphDataLoader {
    constructor() {
        console.log('[GraphDataLoader] Initializing data loader');
        this.cache = new Map();
    }

    async loadDirectory(path) {
        console.log(`[GraphDataLoader] Loading directory: ${path}`);
        try {
            const files = await this.getHTMLFiles(path);
            console.log(`[GraphDataLoader] Found ${files.length} HTML files`);
            
            const nodes = [];
            const edges = [];
            
            for (const file of files) {
                console.log(`[GraphDataLoader] Processing file: ${file}`);
                try {
                    const response = await fetch(file);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const html = await response.text();
                    const metadata = this.extractMetadata(html, file);
                    
                    if (metadata) {
                        nodes.push(metadata);
                        if (metadata.connections) {
                            edges.push(...this.createEdges(metadata));
                        }
                    }
                } catch (fileError) {
                    console.error(`[GraphDataLoader] Error processing file ${file}:`, fileError);
                }
            }
            
            console.log(`[GraphDataLoader] Successfully loaded ${nodes.length} nodes and ${edges.length} edges`);
            return { nodes, edges };
            
        } catch (error) {
            console.error('[GraphDataLoader] Failed to load directory:', error);
            throw new Error(`Failed to load graph data: ${error.message}`);
        }
    }

    async getHTMLFiles(path) {
        console.log(`[GraphDataLoader] Scanning for HTML files in: ${path}`);
        try {
            const response = await fetch(`${path}?list=true`);
            if (!response.ok) {
                throw new Error(`Failed to list directory: ${response.status}`);
            }
            const files = await response.json();
            return files.filter(file => file.endsWith('.html'));
        } catch (error) {
            console.error('[GraphDataLoader] Failed to get HTML files:', error);
            throw error;
        }
    }

    extractMetadata(html, filePath) {
        console.log(`[GraphDataLoader] Extracting metadata from: ${filePath}`);
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const metadata = {
                id: filePath,
                title: doc.title || filePath,
                category: this.getMetaContent(doc, 'graph-category'),
                tags: this.getMetaContent(doc, 'graph-tags')?.split(',').map(t => t.trim()) || [],
                connections: this.getMetaContent(doc, 'graph-connections')?.split(',').map(c => c.trim()) || [],
                created: this.getMetaContent(doc, 'graph-created'),
                modified: this.getMetaContent(doc, 'graph-modified'),
                authors: this.getMetaContent(doc, 'graph-authors')?.split(',').map(a => a.trim()) || []
            };
            
            console.log(`[GraphDataLoader] Successfully extracted metadata for: ${filePath}`);
            return metadata;
            
        } catch (error) {
            console.error(`[GraphDataLoader] Failed to extract metadata from ${filePath}:`, error);
            return null;
        }
    }

    getGraphData() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges.filter(edge => 
                this.nodes.has(edge.source) && this.nodes.has(edge.target)
            )
        };
    }
} 