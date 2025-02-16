export class GraphDataLoader {
    constructor() {
        console.log('[GraphDataLoader] Initializing');
        this.cache = new Map();
    }

    async loadDirectory() {
        console.log('[GraphDataLoader] Starting directory load');
        try {
            const htmlFiles = await this.getHTMLFiles();
            console.log(`[GraphDataLoader] Found ${htmlFiles.length} HTML files`);

            const nodes = [];
            const edges = [];

            for (const file of htmlFiles) {
                try {
                    console.log(`[GraphDataLoader] Processing file: ${file}`);
                    const response = await fetch(file);
                    const html = await response.text();
                    const metadata = await this.extractMetadata(html, file);
                    nodes.push(metadata);
                } catch (error) {
                    console.error(`[GraphDataLoader] Error processing file ${file}:`, error);
                }
            }

            if (nodes.length === 0) {
                throw new Error('No valid nodes found in the directory');
            }

            console.log(`[GraphDataLoader] Successfully loaded ${nodes.length} nodes`);
            
            // Create edges after all nodes are loaded
            const graphEdges = this.createEdges(nodes);
            console.log(`[GraphDataLoader] Created ${graphEdges.length} edges`);

            return { nodes, edges: graphEdges };
        } catch (error) {
            console.error('[GraphDataLoader] Error loading directory:', error);
            throw error;
        }
    }

    async getHTMLFiles() {
        console.log('[GraphDataLoader] Scanning for HTML files');
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

    getMetaContent(doc, name) {
        const meta = doc.querySelector(`meta[name="${name}"]`);
        return meta ? meta.getAttribute('content') : null;
    }

    async extractMetadata(html, filePath) {
        console.log(`[GraphDataLoader] Extracting metadata from ${filePath}`);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        if (!doc) {
            throw new Error(`Failed to parse HTML document: ${filePath}`);
        }

        const title = doc.querySelector('title')?.textContent || filePath;
        const description = this.getMetaContent(doc, 'description') || '';
        const category = this.getMetaContent(doc, 'graph-category') || 'uncategorized';
        const tags = this.getMetaContent(doc, 'graph-tags')?.split(',').map(t => t.trim()) || [];
        const connections = this.getMetaContent(doc, 'graph-connections')?.split(',').map(c => c.trim()) || [];
        const created = this.getMetaContent(doc, 'graph-created') || new Date().toISOString();
        const modified = this.getMetaContent(doc, 'graph-modified') || created;
        const authors = this.getMetaContent(doc, 'graph-authors')?.split(',').map(a => a.trim()) || ['system'];

        const metadata = {
            id: filePath,
            title,
            description,
            category,
            tags,
            connections,
            created,
            modified,
            authors
        };

        console.log(`[GraphDataLoader] Successfully extracted metadata for ${filePath}`);
        return metadata;
    }

    createEdges(nodes) {
        console.log('[GraphDataLoader] Creating edges from node connections');
        const edges = [];
        const nodeMap = new Map(nodes.map(node => [node.id, node]));

        for (const node of nodes) {
            for (const connection of node.connections) {
                if (nodeMap.has(connection)) {
                    edges.push({
                        source: node.id,
                        target: connection,
                        type: 'connection'
                    });
                } else {
                    console.warn(`[GraphDataLoader] Invalid connection in ${node.id}: ${connection}`);
                }
            }
        }

        return edges;
    }
} 