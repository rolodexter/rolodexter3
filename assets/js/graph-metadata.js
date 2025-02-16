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

    async fetchFileContent(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to fetch ${path}`);
            return await response.text();
        } catch (error) {
            console.warn(`Could not fetch ${path}:`, error);
            return null;
        }
    }

    async parseHtmlMetaTags(content) {
        const metadata = {};
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const metaTags = doc.querySelectorAll('meta[name^="graph-"]');
        
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name').replace('graph-', '');
            const content = tag.getAttribute('content');
            if (name && content) {
                metadata[name] = content;
            }
        });
        
        return metadata;
    }

    async parseMdFrontmatter(content) {
        const metadata = {};
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            frontmatter.split('\n').forEach(line => {
                const [key, ...values] = line.split(':').map(s => s.trim());
                if (key && values.length && key.startsWith('graph-')) {
                    metadata[key.replace('graph-', '')] = values.join(':');
                }
            });
        }
        
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

    async buildGraphData() {
        const nodes = [];
        const edges = [];
        
        try {
            // List of paths to scan - add more paths as needed
            const pathsToScan = [
                '/',
                '/docs/',
                '/research/',
                '/legal/',
                '/labs/',
                '/community/',
                '/knowledge/'
            ];
            
            // Find HTML and MD files in each path
            for (const basePath of pathsToScan) {
                // Use window.location to build full path
                const fullPath = new URL(basePath, window.location.href).href;
                const content = await this.fetchFileContent(fullPath);
                
                if (content) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, 'text/html');
                    
                    // Find all HTML links
                    const links = doc.querySelectorAll('a[href$=".html"], a[href$=".md"]');
                    
                    for (const link of links) {
                        const href = link.getAttribute('href');
                        const fileContent = await this.fetchFileContent(href);
                        
                        if (fileContent) {
                            const metadata = href.endsWith('.html') 
                                ? await this.parseHtmlMetaTags(fileContent)
                                : await this.parseMdFrontmatter(fileContent);
                            
                            // Add node
                            nodes.push({
                                id: href,
                                name: href.split('/').pop(),
                                type: href.includes('/docs/') ? 'documentation' : 
                                      href.includes('/research/') ? 'research' : 
                                      href.includes('/legal/') ? 'legal' : 'content',
                                metadata: metadata,
                                cluster: metadata.category,
                                tags: metadata.tags?.split(',').map(t => t.trim()) || []
                            });

                            // Add edges based on metadata connections
                            if (metadata.connections) {
                                metadata.connections.split(',').forEach(target => {
                                    edges.push({
                                        source: href,
                                        target: target.trim(),
                                        type: 'connection'
                                    });
                                });
                            }
                        }
                    }
                }
            }
            
            // Add edges based on shared tags
            nodes.forEach((node, i) => {
                nodes.slice(i + 1).forEach(otherNode => {
                    const sharedTags = node.tags.filter(tag => 
                        otherNode.tags.includes(tag)
                    );
                    
                    if (sharedTags.length > 0) {
                        edges.push({
                            source: node.id,
                            target: otherNode.id,
                            type: 'related',
                            weight: sharedTags.length
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('Error building graph data:', error);
        }
        
        return { nodes, edges };
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

export const graphMetadata = new GraphMetadata();