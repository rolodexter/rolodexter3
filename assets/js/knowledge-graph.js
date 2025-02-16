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

// Knowledge Graph Initialization
import { KnowledgeGraph } from '../../scripts/knowledge-graph.js';
import { GraphDataLoader } from '../../scripts/graph-data-loader.js';
import { GraphSearch } from '../../scripts/search-graph.js';

// Initialize components
let graph, dataLoader, search;

async function initializeKnowledgeGraph() {
    try {
        // Initialize the graph
        const container = document.getElementById('knowledge-graph');
        graph = new KnowledgeGraph(container);
        
        // Load data
        dataLoader = new GraphDataLoader();
        await dataLoader.loadDirectory('.');
        const graphData = dataLoader.getGraphData();
        
        // Update graph with data
        graph.update(graphData);
        
        // Initialize search
        search = new GraphSearch(graph);
        
        // Set up controls
        setupControls();
        
    } catch (error) {
        console.error('Error initializing knowledge graph:', error);
        const container = document.getElementById('knowledge-graph');
        container.innerHTML = `
            <div class="graph-error">
                <h3>Error Loading Knowledge Graph</h3>
                <p>There was an error initializing the knowledge graph. Please try refreshing the page.</p>
                <pre>${error.message}</pre>
            </div>
        `;
    }
}

function setupControls() {
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        const transform = d3.zoomTransform(graph.svg.node());
        graph.svg.call(graph.zoom.transform, transform.scale(transform.k * 1.5));
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        const transform = d3.zoomTransform(graph.svg.node());
        graph.svg.call(graph.zoom.transform, transform.scale(transform.k / 1.5));
    });
    
    document.getElementById('reset-view').addEventListener('click', () => {
        graph.svg.call(graph.zoom.transform, d3.zoomIdentity);
    });
    
    // Add search input
    const controls = document.querySelector('.graph-controls');
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" id="graph-search" placeholder="Search knowledge graph...">
        <select id="category-filter">
            <option value="">All Categories</option>
            <option value="core">Core</option>
            <option value="documentation">Documentation</option>
            <option value="research">Research</option>
            <option value="feature">Feature</option>
            <option value="legal">Legal</option>
            <option value="community">Community</option>
            <option value="labs">Labs</option>
        </select>
    `;
    controls.insertBefore(searchContainer, controls.firstChild);
    
    // Set up search handlers
    const searchInput = document.getElementById('graph-search');
    searchInput.addEventListener('input', (e) => {
        search.search(e.target.value);
    });
    
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.addEventListener('change', (e) => {
        search.filterByCategory(e.target.value);
    });
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
document.addEventListener('DOMContentLoaded', initializeKnowledgeGraph);