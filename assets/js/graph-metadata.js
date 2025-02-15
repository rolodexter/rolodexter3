// Knowledge Graph Metadata Manager
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