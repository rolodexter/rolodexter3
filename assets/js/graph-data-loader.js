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
        // Return a comprehensive list of all HTML files in the project
        return [
            'index.html',
            'knowledge/index.html',
            'labs/index.html',
            'labs/demo.html',
            'research/index.html',
            'community/index.html',
            'memory/index.html',
            'memory/pending-tasks.html',
            'memory/resolved-tasks/index.html',
            'memory/resolved-tasks/metadata-validation-fix.html',
            'memory/resolved-tasks/navigation-structure-update.html',
            'memory/resolved-tasks/footer-standardization.html',
            'memory/rolodexterGPT-memory/session-history.html',
            'docs/CHANGELOG.html',
            'docs/VERSION.html',
            'legal/privacy.html',
            'legal/terms.html',
            'legal/cookies.html',
            'legal/ai-ethics.html'
        ];
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