import { GraphDataLoader } from './graph-data-loader.js';
import { GraphSearch } from './search-graph.js';

export class KnowledgeGraph {
    constructor(containerId) {
        console.log('[KnowledgeGraph] Initializing with container:', containerId);
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth;
        this.height = Math.max(500, window.innerHeight * 0.6);
        this.dataLoader = new GraphDataLoader();
        
        // Add resize handler
        window.addEventListener('resize', () => {
            this.width = this.container.clientWidth;
            this.height = Math.max(500, window.innerHeight * 0.6);
            if (this.svg) {
                this.svg
                    .attr('width', this.width)
                    .attr('height', this.height);
                this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
                this.simulation.alpha(0.3).restart();
            }
        });
    }
    
    async initGraph() {
        console.log('[KnowledgeGraph] Starting initialization');
        try {
            this.showLoading();
            
            // Initialize SVG and simulation first
            this.initSVG();
            this.initSimulation();
            
            console.log('[KnowledgeGraph] Loading graph data');
            const data = await this.dataLoader.loadDirectory();
            
            if (!data || !data.nodes || data.nodes.length === 0) {
                throw new Error('No valid graph data found');
            }
            
            console.log(`[KnowledgeGraph] Loaded ${data.nodes.length} nodes and ${data.edges.length} edges`);
            
            // Render the graph
            this.renderGraph(data.nodes, data.edges);
            this.hideLoading();
            
            // Initialize controls after successful load
            this.initControls();
            
            return true;
        } catch (error) {
            console.error('[KnowledgeGraph] Initialization failed:', error);
            this.showError(`Failed to load knowledge graph: ${error.message}`);
            return false;
        }
    }
    
    initSVG() {
        console.log('[KnowledgeGraph] Initializing SVG');
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr('style', 'max-width: 100%; height: auto;');

        this.g = this.svg.append('g');
        
        // Add zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
            
        this.svg.call(this.zoom);
    }
    
    initSimulation() {
        console.log('[KnowledgeGraph] Initializing force simulation');
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(30))
            .on('tick', () => this.tick());
    }
    
    renderGraph(nodes, edges) {
        // Clear existing graph
        this.g.selectAll('*').remove();
        
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
            .call(this.drag());
            
        // Add circles to nodes
        node.append('circle')
            .attr('r', 10)
            .attr('fill', d => this.getCategoryColor(d.metadata.category))
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
        this.simulation.alpha(1).restart();
    }
    
    getCategoryColor(category) {
        const colors = {
            'core': '#00FFFF',      // Cyan
            'documentation': '#FFD700', // Gold
            'research': '#FF69B4',   // Pink
            'feature': '#32CD32',    // Lime
            'legal': '#9370DB',      // Purple
            'community': '#FF7F50',  // Coral
            'labs': '#20B2AA'        // Light Sea Green
        };
        return colors[category] || '#999999';
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
    
    drag() {
        const simulation = this.simulation;
        
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
        const loadingContainer = this.container.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loadingContainer = this.container.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="error-container">
                <div class="error-message">
                    <h3>Error Loading Knowledge Graph</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            </div>
        `;
    }
    
    tick() {
        if (!this.g) return;
        
        this.g.selectAll('.link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        this.g.selectAll('.node')
            .attr('transform', d => `translate(${d.x},${d.y})`);
    }
}

// Add styles
const style = document.createElement('style');
style.textContent = `
    #knowledge-graph-container {
        position: relative;
        width: 100%;
        height: 600px;
        background: var(--bg-color);
        border-radius: 8px;
        overflow: hidden;
        margin: 2rem 0;
    }
    
    #knowledge-graph {
        width: 100%;
        height: 100%;
    }
    
    .graph-controls {
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        gap: 0.5rem;
        background: var(--bg-color);
        padding: 0.5rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .search-container {
        display: flex;
        gap: 0.5rem;
        margin-right: 1rem;
    }
    
    #graph-search {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--bg-color);
        color: var(--text-color);
    }
    
    #category-filter {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--bg-color);
        color: var(--text-color);
    }
    
    .graph-controls button {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--bg-color);
        color: var(--text-color);
        cursor: pointer;
    }
    
    .graph-controls button:hover {
        background: var(--hover-color);
    }
    
    .graph-error {
        padding: 2rem;
        text-align: center;
        color: var(--text-color);
    }
    
    .graph-error pre {
        margin-top: 1rem;
        padding: 1rem;
        background: var(--code-bg);
        border-radius: 4px;
        overflow-x: auto;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('knowledge-graph');
    if (container) {
        new KnowledgeGraph('#knowledge-graph');
    }
});