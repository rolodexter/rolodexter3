import { GraphDataLoader } from './graph-data-loader.js';

export class KnowledgeGraph {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        
        // Set dimensions based on container
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        
        // Initialize D3 selections
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.edges = [];
        
        // Color mapping for categories
        this.colorMap = {
            'core': '#ff4444',
            'documentation': '#44ff44',
            'research': '#4444ff',
            'feature': '#ffff44',
            'legal': '#ff44ff',
            'community': '#44ffff',
            'labs': '#ff8844',
            'uncategorized': '#999999'
        };
        
        // Initialize data loader
        this.dataLoader = new GraphDataLoader();
        
        // Bind methods
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.handleNodeDrag = this.handleNodeDrag.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
        this.updateSearch = this.updateSearch.bind(this);
        this.updateCategoryFilter = this.updateCategoryFilter.bind(this);
    }
    
    async initGraph() {
        try {
            // Load graph data
            const graphData = await this.dataLoader.loadDirectory();
            if (!graphData || !graphData.nodes || !graphData.edges) {
                throw new Error('Invalid graph data structure');
            }
            
            this.nodes = graphData.nodes;
            this.edges = graphData.edges;
            
            // Create SVG
            this.svg = d3.select(this.container)
                .append('svg')
                .attr('width', this.width)
                .attr('height', this.height);
            
            // Add zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on('zoom', this.handleZoom);
            
            this.svg.call(zoom);
            
            // Create container for zoomable content
            this.graphContainer = this.svg.append('g');
            
            // Initialize force simulation
            this.simulation = d3.forceSimulation(this.nodes)
                .force('link', d3.forceLink(this.edges).id(d => d.id))
                .force('charge', d3.forceManyBody().strength(-100))
                .force('center', d3.forceCenter(this.width / 2, this.height / 2))
                .on('tick', () => this.updateGraph());
            
            // Create edges
            this.edgeElements = this.graphContainer.append('g')
                .selectAll('line')
                .data(this.edges)
                .enter().append('line')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6);
            
            // Create nodes
            this.nodeElements = this.graphContainer.append('g')
                .selectAll('g')
                .data(this.nodes)
                .enter().append('g')
                .call(d3.drag()
                    .on('start', this.handleNodeDrag.start)
                    .on('drag', this.handleNodeDrag.drag)
                    .on('end', this.handleNodeDrag.end));
            
            // Add circles to nodes
            this.nodeElements.append('circle')
                .attr('r', 5)
                .attr('fill', d => this.getNodeColor(d));
            
            // Add labels to nodes
            this.nodeElements.append('text')
                .text(d => d.id)
                .attr('dx', 8)
                .attr('dy', 3);
            
            // Hide loading container
            const loadingContainer = document.querySelector('.loading-container');
            if (loadingContainer) {
                loadingContainer.style.display = 'none';
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing graph:', error);
            throw error;
        }
    }
    
    initControls() {
        // Add search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="node-search" placeholder="Search nodes...">
            <select id="category-filter">
                <option value="all">All Categories</option>
                ${Object.keys(this.colorMap).map(category => 
                    `<option value="${category}">${category.charAt(0).toUpperCase() + category.slice(1)}</option>`
                ).join('')}
            </select>
        `;
        this.container.parentNode.insertBefore(searchContainer, this.container);
        
        // Add event listeners
        document.getElementById('node-search').addEventListener('input', this.updateSearch);
        document.getElementById('category-filter').addEventListener('change', this.updateCategoryFilter);
    }
    
    updateGraph() {
        // Update edge positions
        this.edgeElements
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        // Update node positions
        this.nodeElements.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    }
    
    handleNodeClick(d) {
        // Navigate to node's URL
        window.location.href = d.id;
    }
    
    handleNodeDrag = {
        start: (event, d) => {
            if (!event.active) this.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        },
        drag: (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        },
        end: (event, d) => {
            if (!event.active) this.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }
    
    handleZoom(event) {
        this.graphContainer.attr('transform', event.transform);
    }
    
    updateSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        this.nodeElements.style('display', d => 
            d.id.toLowerCase().includes(searchTerm) ? 'block' : 'none'
        );
        
        // Update edge visibility based on connected nodes
        this.edgeElements.style('display', d => 
            d.source.id.toLowerCase().includes(searchTerm) ||
            d.target.id.toLowerCase().includes(searchTerm) ? 'block' : 'none'
        );
    }
    
    updateCategoryFilter(event) {
        const category = event.target.value;
        this.nodeElements.style('display', d => 
            category === 'all' || d.metadata?.category === category ? 'block' : 'none'
        );
        
        // Update edge visibility based on connected nodes
        this.edgeElements.style('display', d => {
            const sourceVisible = category === 'all' || d.source.metadata?.category === category;
            const targetVisible = category === 'all' || d.target.metadata?.category === category;
            return sourceVisible || targetVisible ? 'block' : 'none';
        });
    }
    
    getNodeColor(node) {
        return this.colorMap[node.metadata?.category] || this.colorMap.uncategorized;
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