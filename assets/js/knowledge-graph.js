import { GraphDataLoader } from './graph-data-loader.js';
import { GraphSearch } from './search-graph.js';

export class KnowledgeGraph {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.simulation = null;
        this.dataLoader = new GraphDataLoader();
        this.isInitialized = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.autoRetry = true;

        if (!this.container) {
            console.error(`[KnowledgeGraph] Container #${containerId} not found`);
            return;
        }

        // Initialize container with loading state
        this.showLoading();
        
        // Set up error boundary
        this.setupErrorBoundary();
    }

    setupErrorBoundary() {
        window.addEventListener('error', (event) => {
            if (event.target === this.container || this.container.contains(event.target)) {
                event.preventDefault();
                this.handleError(event.error);
                return false;
            }
        });
    }

    async initGraph() {
        try {
            if (!this.container) {
                throw new Error('Container not initialized');
            }

            this.showLoading();

            // Initialize SVG and simulation first
            this.initSVG();
            this.initSimulation();
            
            // Load data with retry mechanism
            const data = await this.loadDataWithRetry();
            if (!data || !data.nodes || !data.nodes.length) {
                throw new Error('No graph data available');
            }

            // Render the graph
            this.renderGraph(data.nodes, data.edges);
            
            // Initialize controls after successful render
            this.initControls();
            
            this.hideLoading();
            this.isInitialized = true;
            
            return true;
        } catch (error) {
            this.handleError(error);
            return false;
        }
    }

    async loadDataWithRetry(attempt = 1) {
        try {
            const data = await this.dataLoader.loadDirectory(window.location.origin);
            return data;
        } catch (error) {
            if (attempt < this.maxRetries && this.autoRetry) {
                console.debug(`[KnowledgeGraph] Retrying data load (${attempt}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                return this.loadDataWithRetry(attempt + 1);
            }
            throw error;
        }
    }

    initSVG() {
        try {
            // Clear any existing content
            this.container.innerHTML = '';
            
            // Get container dimensions
            const rect = this.container.getBoundingClientRect();
            this.width = rect.width;
            this.height = rect.height;

            // Create SVG element
            this.svg = d3.select(`#${this.containerId}`)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('viewBox', [0, 0, this.width, this.height]);

            // Add zoom behavior
            this.svg.call(d3.zoom()
                .extent([[0, 0], [this.width, this.height]])
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    this.svg.selectAll('g').attr('transform', event.transform);
                }));

            // Create main group for graph elements
            this.g = this.svg.append('g');
        } catch (error) {
            throw new Error(`Failed to initialize SVG: ${error.message}`);
        }
    }

    initSimulation() {
        try {
            this.simulation = d3.forceSimulation()
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(this.width / 2, this.height / 2))
                .force('collision', d3.forceCollide().radius(30))
                .on('tick', () => this.updateGraphPositions());
        } catch (error) {
            throw new Error(`Failed to initialize simulation: ${error.message}`);
        }
    }

    updateGraphPositions() {
        try {
            this.svg.selectAll('.link')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            this.svg.selectAll('.node')
                .attr('transform', d => `translate(${d.x},${d.y})`);
        } catch (error) {
            console.warn('[KnowledgeGraph] Error updating positions:', error);
            // Don't throw - just log warning to prevent breaking the simulation
        }
    }

    renderGraph(nodes, edges) {
        try {
            // Create edges
            const link = this.g.selectAll('.link')
                .data(edges)
                .join('line')
                .attr('class', 'link')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6);

            // Create nodes
            const node = this.g.selectAll('.node')
                .data(nodes)
                .join('g')
                .attr('class', 'node')
                .call(this.drag());

            // Add circles to nodes
            node.append('circle')
                .attr('r', 5)
                .attr('fill', d => this.getCategoryColor(d.metadata?.category));

            // Add labels to nodes
            node.append('text')
                .attr('class', 'node-label')
                .attr('dx', 8)
                .attr('dy', '.35em')
                .text(d => d.name);

            // Update simulation
            this.simulation
                .nodes(nodes)
                .force('link').links(edges);

            // Restart simulation
            this.simulation.alpha(1).restart();
        } catch (error) {
            throw new Error(`Failed to render graph: ${error.message}`);
        }
    }

    getCategoryColor(category) {
        const colors = {
            core: '#ff4444',
            documentation: '#44ff44',
            research: '#4444ff',
            feature: '#ffff44',
            legal: '#ff44ff',
            community: '#44ffff',
            labs: '#ff8844'
        };
        return colors[category] || '#999999';
    }

    initControls() {
        try {
            const controls = document.createElement('div');
            controls.className = 'graph-controls';
            
            // Add zoom controls
            const zoomIn = document.createElement('button');
            zoomIn.textContent = '+';
            zoomIn.onclick = () => this.zoom(1.2);
            
            const zoomOut = document.createElement('button');
            zoomOut.textContent = '-';
            zoomOut.onclick = () => this.zoom(0.8);
            
            const reset = document.createElement('button');
            reset.textContent = 'Reset';
            reset.onclick = () => this.resetView();
            
            controls.appendChild(zoomIn);
            controls.appendChild(zoomOut);
            controls.appendChild(reset);
            
            this.container.parentNode.appendChild(controls);
        } catch (error) {
            console.warn('[KnowledgeGraph] Failed to initialize controls:', error);
            // Don't throw - controls are not critical for graph function
        }
    }

    zoom(scale) {
        const transform = d3.zoomTransform(this.svg.node());
        this.svg.transition().duration(300).call(
            d3.zoom().transform,
            transform.scale(scale)
        );
    }

    resetView() {
        this.svg.transition().duration(300).call(
            d3.zoom().transform,
            d3.zoomIdentity
        );
    }

    drag() {
        return d3.drag()
            .on('start', this.dragstarted.bind(this))
            .on('drag', this.dragged.bind(this))
            .on('end', this.dragended.bind(this));
    }

    dragstarted(event) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    dragended(event) {
        if (!event.active) this.simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    showLoading() {
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'loading-container';
        loadingContainer.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading knowledge graph...</p>
        `;
        this.container.appendChild(loadingContainer);
    }

    hideLoading() {
        const loadingContainer = this.container.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.remove();
        }
    }

    handleError(error) {
        console.error('[KnowledgeGraph] Error:', error);
        
        this.hideLoading();
        
        // Clear any existing error messages
        const existingError = this.container.querySelector('.error-container');
        if (existingError) {
            existingError.remove();
        }

        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        
        const title = document.createElement('h3');
        title.textContent = 'Error Loading Knowledge Graph';
        
        const message = document.createElement('p');
        message.textContent = error.message || 'An unexpected error occurred';
        
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.onclick = async () => {
            errorContainer.remove();
            this.retryAttempts++;
            await this.initGraph();
        };
        
        errorMessage.appendChild(title);
        errorMessage.appendChild(message);
        errorMessage.appendChild(retryButton);
        errorContainer.appendChild(errorMessage);
        
        this.container.appendChild(errorContainer);
    }

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        if (this.svg) {
            this.svg.remove();
        }
        this.container.innerHTML = '';
        this.isInitialized = false;
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
        const graph = new KnowledgeGraph('knowledge-graph');
        graph.initGraph().catch(error => {
            console.error('Failed to initialize graph:', error);
            container.innerHTML = `
                <div class="error-container">
                    <div class="error-message">
                        <h3>Error Loading Knowledge Graph</h3>
                        <p>${error.message}</p>
                        <button onclick="location.reload()">Retry</button>
                    </div>
                </div>
            `;
        });
    }
});