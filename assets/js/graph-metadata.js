// Knowledge Graph Metadata Manager
export class GraphMetadata {
    constructor() {
        this.metadataCache = new Map();
        this.categoryColors = {
            core: 'var(--neural-gold)',
            documentation: 'var(--hyperglow-cyan)',
            research: 'var(--neural-purple)',
            feature: 'var(--hyperglow-blue)',
            legal: 'var(--text-secondary)',
            community: 'var(--neural-green)',
            labs: 'var(--neural-red)'
        };
    }

    async parseHtmlMetaTags(content) {
        const metadata = {};
        const metaTags = content.match(/<meta name="graph-[^>]+>/g) || [];
        
        metaTags.forEach(tag => {
            const name = tag.match(/name="graph-([^"]+)"/)?.[1];
            const content = tag.match(/content="([^"]+)"/)?.[1];
            if (name && content) {
                metadata[name] = content;
            }
        });
        
        return metadata;
    }

    async parseMdFrontmatter(content) {
        const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
        const metadata = {};
        
        frontmatter.split('\n').forEach(line => {
            const [key, ...values] = line.split(':').map(s => s.trim());
            if (key && values.length) {
                metadata[key.replace('graph-', '')] = values.join(':');
            }
        });
        
        return metadata;
    }

    getCategoryColor(category) {
        return this.categoryColors[category] || 'var(--text-primary)';
    }

    getNodeSize(metadata) {
        const baseSize = 5;
        const weights = {
            core: 2,
            documentation: 1.5,
            feature: 1.3
        };
        return baseSize * (weights[metadata.category] || 1);
    }

    async cacheMetadata(filepath, metadata) {
        this.metadataCache.set(filepath, {
            ...metadata,
            lastUpdated: new Date().toISOString()
        });
    }

    async getMetadata(filepath) {
        return this.metadataCache.get(filepath);
    }

    clearCache() {
        this.metadataCache.clear();
    }
}

const graphMetadata = {
    tags: {
        ai: ['machine-learning', 'neural-networks', 'nlp', 'chatbot'],
        blockchain: ['solana', 'web3', 'smart-contracts', 'token-gating'],
        development: ['frontend', 'backend', 'api', 'documentation'],
        core: ['system', 'architecture', 'infrastructure'],
        content: ['research', 'knowledge', 'media', 'documentation']
    },

    categories: ['core', 'feature', 'documentation', 'research', 'legal', 'community'],

    validateMetadata: (meta) => {
        // Only require category and tags for basic functionality
        const required = ['graph-category', 'graph-tags'];
        const hasRequired = required.every(field => meta.hasOwnProperty(field));
        
        // If basic fields are missing, create default values
        if (!hasRequired) {
            meta['graph-category'] = meta['graph-category'] || 'content';
            meta['graph-tags'] = meta['graph-tags'] || '';
        }
        
        // Optional fields with defaults
        meta['graph-created'] = meta['graph-created'] || new Date().toISOString();
        meta['graph-modified'] = meta['graph-modified'] || meta['graph-created'];
        meta['graph-authors'] = meta['graph-authors'] || '';
        
        return true; // Always return true but with validated/defaulted data
    },

    parseFileConnections: (content) => {
        // Parse HTML/MD files for links and references
        const linkPattern = /href=["'](.*?\.(?:html|md))["']/g;
        const mdLinkPattern = /\[.*?\]\((.*?\.(?:html|md))\)/g;
        let matches = [...content.matchAll(linkPattern), ...content.matchAll(mdLinkPattern)];
        return matches.map(m => m[1]).filter(unique);
    },

    buildGraphData: async () => {
        const nodes = [];
        const edges = [];
        
        try {
            // Fetch all HTML and MD files from the workspace
            const files = await fetch('/api/repository/files').then(res => res.json());
            
            // Process each file
            for (const file of files) {
                if (file.path.match(/\.(html|md)$/)) {
                    const meta = await fetch(`/api/file/metadata?path=${file.path}`).then(res => res.json());
                    
                    if (meta && graphMetadata.validateMetadata(meta)) {
                        // Add node
                        nodes.push({
                            id: file.path,
                            name: file.name || file.path.split('/').pop(),
                            type: file.path.includes('/docs/') ? 'documentation' : 
                                  file.path.includes('/research/') ? 'research' : 
                                  file.path.includes('/legal/') ? 'legal' : 'content',
                            metadata: meta,
                            cluster: meta['graph-category'],
                            tags: meta['graph-tags'].split(',').map(t => t.trim())
                        });

                        // Add edges based on metadata connections
                        if (meta['graph-connections']) {
                            meta['graph-connections'].split(',').forEach(target => {
                                edges.push({
                                    source: file.path,
                                    target: target.trim(),
                                    type: 'connection'
                                });
                            });
                        }

                        // Add edges based on tags
                        nodes.forEach(existingNode => {
                            const sharedTags = meta['graph-tags']
                                .split(',')
                                .filter(tag => existingNode.tags?.includes(tag));
                            
                            if (sharedTags.length > 0) {
                                edges.push({
                                    source: file.path,
                                    target: existingNode.id,
                                    type: 'related',
                                    weight: sharedTags.length
                                });
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error building graph data:', error);
        }
        
        return { nodes, edges };
    }
};

// Export for use in knowledge-graph.js
export { graphMetadata };