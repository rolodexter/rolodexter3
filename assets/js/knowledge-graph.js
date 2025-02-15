import { GraphDataLoader } from './graph-data-loader.js';
import { GraphSearch } from './search-graph.js';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #knowledge-graph-container {
        position: relative;
        width: 100%;
        height: 100vh;
        max-height: 80vh;
        border: 1px solid var(--border-color, #ccc);
        border-radius: 8px;
        overflow: hidden;
        margin: 1rem 0;
    }

    @media (max-width: 768px) {
        #knowledge-graph-container {
            height: calc(100vh - 120px);
            max-height: none;
            margin: 0.5rem 0;
        }
    }

    #knowledge-graph {
        width: 100%;
        height: 100%;
        touch-action: manipulation;
    }

    .graph-controls {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        z-index: 10;
        background: var(--bg-primary, rgba(255, 255, 255, 0.9));
        padding: 0.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 768px) {
        .graph-controls {
            bottom: 0.5rem;
            right: 0.5rem;
            left: 0.5rem;
            justify-content: center;
        }
    }

    .search-container {
        display: flex;
        gap: 0.5rem;
        flex: 1;
        min-width: 200px;
    }

    @media (max-width: 768px) {
        .search-container {
            flex-basis: 100%;
            order: -1;
        }
    }

    #graph-search {
        flex: 1;
        min-width: 150px;
        padding: 0.5rem;
        border: 1px solid var(--border-color, #ccc);
        border-radius: 4px;
        font-size: 14px;
    }

    #category-filter {
        padding: 0.5rem;
        border: 1px solid var(--border-color, #ccc);
        border-radius: 4px;
        font-size: 14px;
    }

    .graph-controls button {
        background: var(--control-bg, rgba(255, 255, 255, 0.9));
        border: 1px solid var(--border-color, #ccc);
        border-radius: 4px;
        padding: 0.5rem;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
        min-width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    @media (max-width: 768px) {
        .graph-controls button {
            min-width: 3rem;
            height: 3rem;
            font-size: 1.2rem;
        }
    }

    .loading-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--overlay-bg, rgba(255, 255, 255, 0.9));
        z-index: 20;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--spinner-color, #f3f3f3);
        border-top: 4px solid var(--accent-color, #3498db);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }

    .error-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--overlay-bg, rgba(255, 255, 255, 0.9));
        z-index: 30;
        padding: 2rem;
    }

    .error-message {
        background: var(--error-bg, #fff);
        border: 1px solid var(--error-border, #ff4444);
        border-radius: 8px;
        padding: 2rem;
        max-width: 400px;
        text-align: center;
    }

    .error-message h3 {
        color: var(--error-text, #ff4444);
        margin-bottom: 1rem;
    }

    .error-message button {
        margin-top: 1rem;
        padding: 0.5rem 1.5rem;
        background: var(--button-bg, #ff4444);
        color: var(--button-text, #fff);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    }

    .error-message button:hover {
        background: var(--button-hover, #ff6666);
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

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
            console.warn(`[KnowledgeGraph] Container #${containerId} not found, creating fallback`);
            this.container = this.createFallbackContainer();
            return;
        }

        // Initialize container with loading state
        this.showLoading();
        
        // Set up error boundary
        this.setupErrorBoundary();
    }

    setupErrorBoundary() {
        if (!this.container) return;

        window.addEventListener('error', (event) => {
            try {
                if (event.target instanceof Node && this.container instanceof Node) {
                    if (this.container === event.target || this.container.contains(event.target)) {
                        event.preventDefault();
                        this.handleError(event.error);
                        return false;
                    }
                }
            } catch (error) {
                console.warn('Error in error boundary:', error);
            }
        });
    }

    async initGraph() {
        try {
            if (!this.container) {
                throw new Error('Container not initialized');
            }

            this.showLoading();

            // Make container responsive
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    this.width = width;
                    this.height = height;
                    if (this.svg) {
                        this.svg
                            .attr('width', width)
                            .attr('height', height);
                        
                        // Update force center
                        this.simulation.force('center')
                            .x(width / 2)
                            .y(height / 2);
                        
                        this.simulation.alpha(0.3).restart();
                    }
                }
            });
            
            resizeObserver.observe(this.container);

            // Initialize SVG and simulation first
            this.initSVG();
            this.initSimulation();
            
            // Enable touch support
            if ('ontouchstart' in window) {
                this.enableTouchSupport();
            }
            
            // Load data with retry mechanism
            return this.loadDataWithRetry()
                .then(data => {
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
                })
                .catch(error => {
                    this.handleError(error);
                    return false;
                });
        } catch (error) {
            this.handleError(error);
            return Promise.resolve(false);
        }
    }

    async loadDataWithRetry(attempt = 1) {
        try {
            // Load data without using window.location.origin
            const data = await this.dataLoader.loadDirectory();
            
            if (!data || !data.nodes || data.nodes.length === 0) {
                throw new Error('No graph data available');
            }
            
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
            // Ensure container exists
            if (!this.container) {
                throw new Error('Container not found');
            }
            
            // Clear any existing content
            this.container.innerHTML = '';
            
            // Get container dimensions
            const rect = this.container.getBoundingClientRect();
            this.width = rect.width || 800;
            this.height = rect.height || 600;

            console.debug('[KnowledgeGraph] Container dimensions:', { width: this.width, height: this.height });

            // Create SVG element with responsive attributes
            this.svg = d3.select(`#${this.containerId}`)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('viewBox', [0, 0, this.width, this.height])
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .style('max-width', '100%')
                .style('height', 'auto');

            // Add zoom behavior
            const zoom = d3.zoom()
                .extent([[0, 0], [this.width, this.height]])
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    if (this.g) {
                        this.g.attr('transform', event.transform);
                    }
                });

            this.svg.call(zoom);

            // Create main group for graph elements
            this.g = this.svg.append('g');
            
            console.debug('[KnowledgeGraph] SVG initialized');
            return true;
        } catch (error) {
            this.handleError(error);
            return false;
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
            // Debug: Log initial data
            console.debug('[KnowledgeGraph] Initial data:', { nodes, edges });

            // Format nodes to ensure they are objects
            const nodeObjects = nodes.map(node => {
                if (typeof node === 'string') {
                    return {
                        id: node,
                        name: node.split('/').pop().replace('.html', ''),
                        type: 'default',
                        // Initialize physics properties
                        vx: 0,
                        vy: 0,
                        x: this.width / 2 + (Math.random() - 0.5) * 100,
                        y: this.height / 2 + (Math.random() - 0.5) * 100
                    };
                }
                return {
                    ...node,
                    vx: node.vx || 0,
                    vy: node.vy || 0,
                    x: node.x || this.width / 2 + (Math.random() - 0.5) * 100,
                    y: node.y || this.height / 2 + (Math.random() - 0.5) * 100
                };
            });

            // Create a map for quick node lookup
            const nodeMap = new Map(nodeObjects.map(node => [node.id, node]));

            // Format edges to ensure they use node objects
            const edgeObjects = edges.map(edge => {
                const sourceNode = nodeMap.get(edge.source) || nodeMap.get(typeof edge.source === 'object' ? edge.source.id : edge.source);
                const targetNode = nodeMap.get(edge.target) || nodeMap.get(typeof edge.target === 'object' ? edge.target.id : edge.target);

                if (!sourceNode || !targetNode) {
                    console.warn('[KnowledgeGraph] Missing node reference:', { edge, sourceNode, targetNode });
                    return null;
                }

                return {
                    source: sourceNode,
                    target: targetNode,
                    weight: edge.weight || 1
                };
            }).filter(Boolean); // Remove any null edges

            // Debug: Log formatted data
            console.debug('[KnowledgeGraph] Formatted data for D3:', {
                nodes: nodeObjects,
                edges: edgeObjects
            });

            // Add temporary debug styling to SVG
            if (!document.getElementById('graph-debug-style')) {
                const debugStyle = document.createElement('style');
                debugStyle.id = 'graph-debug-style';
                debugStyle.textContent = `
                    .debug-mode svg {
                        background-color: rgba(200, 200, 200, 0.1);
                        outline: 1px solid rgba(255, 0, 0, 0.2);
                    }
                    .debug-mode .node circle {
                        stroke: rgba(0, 0, 0, 0.5);
                        stroke-width: 1px;
                    }
                    .debug-mode .link {
                        stroke-width: 2px;
                    }
                `;
                document.head.appendChild(debugStyle);
                this.container.classList.add('debug-mode');
            }

            // Adjust node size based on screen size
            const baseRadius = window.innerWidth <= 768 ? 8 : 5;
            
            // Create edges
            const link = this.g.selectAll('.link')
                .data(edgeObjects)
                .join('line')
                .attr('class', 'link')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', d => Math.sqrt(d.weight));

            // Create nodes
            const node = this.g.selectAll('.node')
                .data(nodeObjects)
                .join('g')
                .attr('class', 'node')
                .call(this.drag());

            // Add circles to nodes
            node.append('circle')
                .attr('r', baseRadius)
                .attr('fill', d => this.getCategoryColor(d.metadata?.category));

            // Add labels to nodes
            node.append('text')
                .attr('class', 'node-label')
                .attr('dx', baseRadius + 3)
                .attr('dy', '.35em')
                .text(d => d.name)
                .style('font-size', window.innerWidth <= 768 ? '14px' : '12px');

            // Update simulation with the formatted data
            this.simulation
                .nodes(nodeObjects)
                .force('link')
                .links(edgeObjects);

            // Adjust force simulation parameters
            this.simulation
                .force('charge')
                .strength(window.innerWidth <= 768 ? -300 : -200)
                .distanceMax(window.innerWidth <= 768 ? 200 : 300);

            this.simulation
                .force('link')
                .distance(window.innerWidth <= 768 ? 150 : 100)
                .strength(d => 1 / Math.min(d.source.weight || 1, d.target.weight || 1));

            // Add collision force to prevent node overlap
            this.simulation
                .force('collision')
                .radius(d => (baseRadius + 5) * (d.weight || 1));

            // Debug: Log simulation configuration
            console.debug('[KnowledgeGraph] Simulation config:', {
                charge: this.simulation.force('charge'),
                link: this.simulation.force('link'),
                collision: this.simulation.force('collision')
            });

            // Restart simulation
            this.simulation.alpha(1).restart();

            // Monitor simulation progress
            this.simulation.on('tick.debug', () => {
                const energy = this.simulation.alpha();
                if (energy < 0.1) {
                    console.debug('[KnowledgeGraph] Simulation settling:', { energy });
                }
            });
        } catch (error) {
            console.error('Failed to render graph:', error);
            this.handleError(error);
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
        
        let title, message, actionButton;
        
        if (error.message.includes('Failed to load graph data') || error.message.includes('No graph data available')) {
            title = '⚠️ Data Loading Error';
            message = 'Unable to load the knowledge graph data. This might be due to:';
            const reasons = document.createElement('ul');
            reasons.innerHTML = `
                <li>Missing or inaccessible data files</li>
                <li>Network connectivity issues</li>
                <li>Server configuration problems</li>
            `;
            actionButton = {
                text: 'Try Again',
                action: async () => {
                    errorContainer.remove();
                    this.retryAttempts++;
                    await this.initGraph();
                }
            };
        } else if (error.message.includes('Container not initialized')) {
            title = '⚠️ Initialization Error';
            message = 'The knowledge graph container could not be initialized.';
            actionButton = {
                text: 'Reload Page',
                action: () => window.location.reload()
            };
        } else {
            title = '⚠️ Unexpected Error';
            message = error.message || 'An unexpected error occurred';
            actionButton = {
                text: 'Retry',
                action: async () => {
                    errorContainer.remove();
                    this.retryAttempts++;
                    await this.initGraph();
                }
            };
        }
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        
        const button = document.createElement('button');
        button.textContent = actionButton.text;
        button.onclick = actionButton.action;
        
        errorMessage.appendChild(titleElement);
        errorMessage.appendChild(messageElement);
        if (reasons) errorMessage.appendChild(reasons);
        errorMessage.appendChild(button);
        errorContainer.appendChild(errorMessage);
        
        this.container.appendChild(errorContainer);
        
        // Show warning banner if configured
        if (config.debug.logToUI) {
            this.showWarningBanner(error.message);
        }
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

    createFallbackContainer() {
        const fallback = document.createElement('div');
        fallback.className = 'knowledge-graph-fallback';
        fallback.innerHTML = `
            <div class="fallback-message">
                <h3>⚠️ Knowledge Graph Container Not Found</h3>
                <p>The knowledge graph container element is missing. Please ensure your HTML includes:</p>
                <pre><code>&lt;div id="knowledge-graph"&gt;&lt;/div&gt;</code></pre>
                <button onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
        
        // Add fallback styles
        const style = document.createElement('style');
        style.textContent = `
            .knowledge-graph-fallback {
                padding: 2rem;
                border: 1px solid var(--border-color, #ccc);
                border-radius: 8px;
                background: var(--bg-color, #fff);
                text-align: center;
            }
            
            .fallback-message {
                max-width: 500px;
                margin: 0 auto;
            }
            
            .fallback-message h3 {
                color: var(--warning-color, #ff9800);
                margin-bottom: 1rem;
            }
            
            .fallback-message pre {
                background: var(--code-bg, #f5f5f5);
                padding: 1rem;
                border-radius: 4px;
                margin: 1rem 0;
                text-align: left;
                overflow-x: auto;
            }
            
            .fallback-message button {
                background: var(--primary-color, #4a90e2);
                color: white;
                border: none;
                padding: 0.5rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
            }
            
            .fallback-message button:hover {
                background: var(--primary-hover, #357abd);
            }
        `;
        document.head.appendChild(style);
        
        // Insert after the missing container's expected location
        const script = document.currentScript;
        script.parentNode.insertBefore(fallback, script);
        
        return fallback;
    }

    showWarningBanner(message) {
        const banner = document.createElement('div');
        banner.className = 'warning-banner';
        banner.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-message">${message}</span>
                <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add banner styles if not already added
        if (!document.querySelector('#warning-banner-styles')) {
            const style = document.createElement('style');
            style.id = 'warning-banner-styles';
            style.textContent = `
                .warning-banner {
                    position: fixed;
                    top: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 10000;
                    background: var(--warning-bg, #fff3cd);
                    border: 1px solid var(--warning-border, #ffeeba);
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    animation: slideDown 0.3s ease-out;
                }
                
                .warning-content {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    gap: 0.5rem;
                }
                
                .warning-icon {
                    font-size: 1.25rem;
                }
                
                .warning-message {
                    color: var(--warning-text, #856404);
                    font-weight: 500;
                }
                
                .warning-close {
                    background: none;
                    border: none;
                    color: var(--warning-text, #856404);
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0 0.5rem;
                    margin-left: auto;
                }
                
                .warning-close:hover {
                    color: var(--warning-text-hover, #533f03);
                }
                
                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); }
                    to { transform: translate(-50%, 0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(banner);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (banner.parentElement) {
                banner.remove();
            }
        }, 5000);
    }

    enableTouchSupport() {
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                if (this.g) {
                    this.g.attr('transform', event.transform);
                }
            });

        this.svg
            .call(zoom)
            .on('touchstart', (event) => {
                if (event.touches.length === 1) {
                    event.preventDefault();
                }
            })
            .on('touchmove', (event) => {
                if (event.touches.length === 1) {
                    event.preventDefault();
                }
            });
    }
}

// Initialize when DOM is ready
function initializeGraph() {
    const container = document.getElementById('knowledge-graph');
    if (!container) {
        console.warn('Knowledge graph container not found');
        return;
    }

    try {
        const graph = new KnowledgeGraph('knowledge-graph');
        graph.initGraph().catch(error => {
            console.error('Failed to initialize graph:', error);
            if (container) {
                container.innerHTML = `
                    <div class="error-container">
                        <div class="error-message">
                            <h3>Error Loading Knowledge Graph</h3>
                            <p>${error.message}</p>
                            <button onclick="window.location.reload()">Retry</button>
                        </div>
                    </div>
                `;
            }
        });
    } catch (error) {
        console.error('Error creating knowledge graph:', error);
    }
}

// Use a more reliable way to detect when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGraph);
} else {
    initializeGraph();
}