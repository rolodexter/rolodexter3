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
            
            await Promise.all(urls.map(url => this.loadPage(url)));
        } catch (error) {
            console.error('Error loading directory:', error);
            throw error;
        }
    }

    async loadPage(url) {
        try {
            const response = await fetch(url);
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
            console.error(`Error loading page ${url}:`, error);
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