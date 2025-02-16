import { graphMetadata } from './graph-metadata.js';

class KnowledgeGraph {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = this.container.node().getBoundingClientRect().height;
        
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height]);
            
        this.g = this.svg.append('g');
        
        // Initialize zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
            
        this.svg.call(this.zoom);
        
        // Initialize simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(30));
            
        // Initialize controls
        this.initControls();
    }
    
    async initGraph() {
        try {
            this.showLoading();
            const { nodes, edges } = await graphMetadata.buildGraphData();
            this.renderGraph(nodes, edges);
            this.hideLoading();
        } catch (error) {
            console.error('Failed to initialize graph:', error);
            this.showError();
        }
    }
    
    renderGraph(nodes, edges) {
        // Create links
        const link = this.g.selectAll('.link')
            .data(edges)
            .join('line')
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.sqrt(d.weight || 1));
            
        // Create nodes
        const node = this.g.selectAll('.node')
            .data(nodes)
            .join('g')
            .attr('class', 'node')
            .call(this.drag(this.simulation));
            
        // Add circles to nodes
        node.append('circle')
            .attr('r', d => graphMetadata.getNodeSize(d.metadata))
            .attr('fill', d => graphMetadata.getCategoryColor(d.metadata.category))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
            
        // Add labels to nodes
        node.append('text')
            .attr('class', 'node-label')
            .attr('dx', 12)
            .attr('dy', '.35em')
            .text(d => d.name)
            .on('click', (event, d) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = d.id;
            });
            
        // Update simulation
        this.simulation
            .nodes(nodes)
            .on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                    
                node
                    .attr('transform', d => `translate(${d.x},${d.y})`);
            });
            
        this.simulation.force('link').links(edges);
    }
    
    initControls() {
        // Zoom controls
        d3.select('#zoom-in').on('click', () => {
            this.svg.transition().call(
                this.zoom.scaleBy, 1.5
            );
        });
        
        d3.select('#zoom-out').on('click', () => {
            this.svg.transition().call(
                this.zoom.scaleBy, 0.75
            );
        });
        
        d3.select('#reset-view').on('click', () => {
            this.svg.transition().call(
                this.zoom.transform,
                d3.zoomIdentity
            );
        });
    }
    
    drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
    
    showLoading() {
        this.container.append('div')
            .attr('class', 'loading-indicator')
            .html('Loading knowledge graph...');
    }
    
    hideLoading() {
        this.container.select('.loading-indicator').remove();
    }
    
    showError() {
        const error = this.container.append('div')
            .attr('class', 'error-container');
            
        error.append('div')
            .attr('class', 'error-message')
            .html(`
                <p>Failed to load the knowledge graph.</p>
                <button onclick="location.reload()">Retry</button>
            `);
    }
}

// Initialize graph when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const graph = new KnowledgeGraph('#knowledge-graph');
    graph.initGraph();
});