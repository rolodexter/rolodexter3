// Graph Data Loader - Converts file metadata into graph structure
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

export class GraphDataLoader {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }

    async loadDirectory(path) {
        try {
            const response = await fetch(`${path}/sitemap.xml`);
            const text = await response.text();
            const parser = new DOMParser();
            const sitemap = parser.parseFromString(text, 'text/xml');
            const urls = Array.from(sitemap.querySelectorAll('url loc')).map(loc => loc.textContent);
            
            // Process files in parallel but handle errors individually
            const results = await Promise.allSettled(urls.map(url => this.loadPage(url)));
            
            // Log only actual errors, not 404s for optional files
            results.forEach((result, index) => {
                if (result.status === 'rejected' && !result.reason.message.includes('404')) {
                    console.warn(`[GraphDataLoader] Failed to load ${urls[index]}:`, result.reason);
                }
            });
        } catch (error) {
            console.warn('[GraphDataLoader] Error loading directory:', error);
            // Continue with any successfully loaded data
        }
    }

    async loadPage(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    // Silently skip 404s for optional files
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
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
            const id = new URL(url).pathname;
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
            if (error.message.includes('404')) {
                // Silently ignore 404s
                return;
            }
            console.debug(`[GraphDataLoader] Error loading page ${url}:`, error);
            throw error; // Re-throw non-404 errors
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

module.exports = GraphDataLoader; 