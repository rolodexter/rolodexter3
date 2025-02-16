export class GraphDataLoader {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }

    async loadDirectory(path) {
        try {
            // Get all HTML files in the directory
            const files = await this.getHTMLFiles(path);
            await Promise.all(files.map(file => this.loadFile(file)));
            return this.getGraphData();
        } catch (error) {
            console.error('Error loading directory:', error);
            throw error;
        }
    }

    async getHTMLFiles(path) {
        // In a real implementation, this would scan the directory
        // For now, return a hardcoded list of known files
        return [
            'index.html',
            'memory/index.html',
            'memory/pending-tasks.html',
            'memory/resolved-tasks/index.html',
            'memory/resolved-tasks/metadata-validation-fix.html',
            'memory/resolved-tasks/navigation-structure-update.html',
            'memory/resolved-tasks/footer-standardization.html',
            'docs/CHANGELOG.html',
            'docs/VERSION.html',
            'legal/privacy.html',
            'legal/terms.html',
            'legal/cookies.html',
            'legal/ai-ethics.html'
        ];
    }

    async loadFile(file) {
        try {
            const response = await fetch(file);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            // Extract metadata
            const metadata = {};
            const metaTags = doc.querySelectorAll('meta[name^="graph-"]');
            metaTags.forEach(tag => {
                const name = tag.getAttribute('name').replace('graph-', '');
                metadata[name] = tag.getAttribute('content');
            });
            
            if (Object.keys(metadata).length === 0) return;
            
            // Create node
            const id = file;
            const name = doc.title || id;
            const node = { id, name, metadata };
            this.nodes.set(id, node);
            
            // Process connections
            if (metadata.connections) {
                const connections = metadata.connections.split(',').map(c => c.trim());
                connections.forEach(target => {
                    this.edges.push({
                        source: id,
                        target,
                        weight: 1
                    });
                });
            }
        } catch (error) {
            console.error(`Error loading file ${file}:`, error);
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