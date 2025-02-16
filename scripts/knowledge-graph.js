// Knowledge Graph Visualization using D3.js
const d3 = require('d3');
const { JSDOM } = require('jsdom');

// Configuration
const CONFIG = {
    width: 1200,
    height: 800,
    nodeRadius: 8,
    linkDistance: 100,
    charge: -300,
    fontSize: 12,
    colors: {
        node: {
            core: '#FF4081',
            documentation: '#2196F3',
            research: '#4CAF50',
            feature: '#FFC107',
            legal: '#9C27B0',
            community: '#00BCD4',
            labs: '#FF5722'
        },
        link: '#999',
        text: '#333',
        textHighlight: '#000'
    }
};

class KnowledgeGraph {
    constructor(container) {
        // Create virtual DOM for server-side rendering
        const dom = new JSDOM('<!DOCTYPE html><div id="graph"></div>');
        this.document = dom.window.document;
        this.container = container || this.document.getElementById('graph');
        
        // Initialize D3 force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(CONFIG.linkDistance))
            .force('charge', d3.forceManyBody().strength(CONFIG.charge))
            .force('center', d3.forceCenter(CONFIG.width / 2, CONFIG.height / 2));
        
        this.initializeSVG();
    }
    
    initializeSVG() {
        // Create SVG container
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', CONFIG.width)
            .attr('height', CONFIG.height)
            .attr('class', 'knowledge-graph');
        
        // Add zoom behavior
        this.svg.call(d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.svg.select('g').attr('transform', event.transform);
            }));
        
        // Create container for graph elements
        this.g = this.svg.append('g');
        
        // Initialize graph elements
        this.link = this.g.append('g')
            .attr('class', 'links')
            .selectAll('line');
        
        this.node = this.g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle');
        
        this.text = this.g.append('g')
            .attr('class', 'labels')
            .selectAll('text');
    }
    
    update(data) {
        // Update links
        this.link = this.link.data(data.links, d => `${d.source.id}-${d.target.id}`);
        this.link.exit().remove();
        this.link = this.link.enter()
            .append('line')
            .attr('stroke', CONFIG.colors.link)
            .attr('stroke-width', 1)
            .merge(this.link);
        
        // Update nodes
        this.node = this.node.data(data.nodes, d => d.id);
        this.node.exit().remove();
        this.node = this.node.enter()
            .append('circle')
            .attr('r', CONFIG.nodeRadius)
            .attr('fill', d => CONFIG.colors.node[d.category] || CONFIG.colors.node.documentation)
            .call(this.drag())
            .merge(this.node);
        
        // Update labels
        this.text = this.text.data(data.nodes, d => d.id);
        this.text.exit().remove();
        this.text = this.text.enter()
            .append('text')
            .text(d => d.label || d.id)
            .attr('font-size', CONFIG.fontSize)
            .attr('dx', CONFIG.nodeRadius + 5)
            .attr('dy', CONFIG.fontSize / 2)
            .merge(this.text);
        
        // Update simulation
        this.simulation.nodes(data.nodes)
            .on('tick', () => this.tick());
        
        this.simulation.force('link')
            .links(data.links);
        
        this.simulation.alpha(1).restart();
    }
    
    tick() {
        // Update positions on each simulation tick
        this.link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        this.node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        this.text
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    }
    
    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
    
    search(query) {
        if (!query) {
            // Reset all nodes and links to default state
            this.node.attr('opacity', 1);
            this.link.attr('opacity', 1);
            this.text.attr('opacity', 1);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        
        // Highlight matching nodes and their connections
        this.node.attr('opacity', d => 
            d.label.toLowerCase().includes(lowerQuery) || 
            d.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ? 1 : 0.1
        );
        
        this.link.attr('opacity', d =>
            d.source.label.toLowerCase().includes(lowerQuery) ||
            d.target.label.toLowerCase().includes(lowerQuery) ? 1 : 0.1
        );
        
        this.text.attr('opacity', d =>
            d.label.toLowerCase().includes(lowerQuery) ? 1 : 0.1
        );
    }
}

module.exports = KnowledgeGraph; 