// Graph Data Loader - Converts file metadata into graph structure
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

class GraphDataLoader {
    constructor() {
        this.nodes = new Map();
        this.links = new Set();
    }
    
    async loadDirectory(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                if (!entry.name.startsWith('.') && 
                    !['node_modules', 'dist', 'build'].includes(entry.name)) {
                    await this.loadDirectory(fullPath);
                }
            } else if (entry.name.endsWith('.html') || entry.name.endsWith('.md')) {
                await this.processFile(fullPath);
            }
        }
    }
    
    async processFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const metadata = await this.extractMetadata(filePath, content);
        
        if (!metadata) return;
        
        // Create or update node for the file
        const fileNode = {
            id: filePath,
            label: metadata.title || path.basename(filePath),
            category: metadata.category,
            tags: metadata.tags,
            type: 'file'
        };
        this.nodes.set(filePath, fileNode);
        
        // Create nodes and links for tags
        metadata.tags.forEach(tag => {
            const tagNode = {
                id: `tag:${tag}`,
                label: tag,
                category: 'tag',
                type: 'tag'
            };
            this.nodes.set(tagNode.id, tagNode);
            
            this.links.add({
                source: filePath,
                target: tagNode.id,
                type: 'has_tag'
            });
        });
        
        // Create links for connections
        metadata.connections.forEach(conn => {
            this.links.add({
                source: filePath,
                target: conn,
                type: 'connects_to'
            });
        });
    }
    
    async extractMetadata(filePath, content) {
        if (filePath.endsWith('.html')) {
            return this.extractHtmlMetadata(content);
        } else if (filePath.endsWith('.md')) {
            return this.extractMarkdownMetadata(content);
        }
        return null;
    }
    
    extractHtmlMetadata(content) {
        const dom = new JSDOM(content);
        const doc = dom.window.document;
        
        const getMeta = (name) => {
            const meta = doc.querySelector(`meta[name="${name}"]`);
            return meta ? meta.getAttribute('content') : null;
        };
        
        const category = getMeta('graph-category');
        const tags = getMeta('graph-tags')?.split(',').map(t => t.trim()) || [];
        const connections = getMeta('graph-connections')?.split(',').map(c => c.trim()) || [];
        const title = doc.title || null;
        
        if (!category) return null;
        
        return { category, tags, connections, title };
    }
    
    extractMarkdownMetadata(content) {
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) return null;
        
        const frontMatter = frontMatterMatch[1];
        const metadata = {};
        
        // Parse YAML-style front matter
        frontMatter.split('\n').forEach(line => {
            const [key, ...values] = line.split(':').map(s => s.trim());
            if (key && values.length) {
                const value = values.join(':').replace(/^['"]|['"]$/g, '');
                metadata[key] = value;
            }
        });
        
        if (!metadata['graph-category']) return null;
        
        return {
            category: metadata['graph-category'],
            tags: metadata['graph-tags']?.split(',').map(t => t.trim()) || [],
            connections: metadata['graph-connections']?.split(',').map(c => c.trim()) || [],
            title: metadata.title || null
        };
    }
    
    getGraphData() {
        return {
            nodes: Array.from(this.nodes.values()),
            links: Array.from(this.links).map(link => ({
                source: link.source,
                target: link.target,
                type: link.type
            }))
        };
    }
}

module.exports = GraphDataLoader; 