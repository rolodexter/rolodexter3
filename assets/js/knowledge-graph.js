// Knowledge Graph Implementation
class KnowledgeGraph {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.initializeGraph();
    }

    initializeGraph() {
        this.svg = this.container
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', [0, 0, this.width, this.height])
            .attr('class', 'knowledge-graph');

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.svg.selectAll('g').attr('transform', event.transform);
            });

        this.svg.call(zoom);
        
        // Initialize force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));
    }

    updateData(nodes, links) {
        this.nodes = nodes;
        this.links = links;
        
        // Create the links
        const link = this.svg.selectAll('.link')
            .data(links)
            .join('line')
            .attr('class', 'link')
            .attr('stroke', 'var(--hyperglow-cyan)')
            .attr('stroke-width', 1)
            .attr('opacity', 0.6);

        // Create the nodes
        const node = this.svg.selectAll('.node')
            .data(nodes)
            .join('g')
            .attr('class', 'node')
            .call(this.drag());

        node.append('circle')
            .attr('r', 5)
            .attr('fill', 'var(--neural-gold)')
            .attr('stroke', 'var(--hyperglow-cyan)')
            .attr('stroke-width', 2);

        node.append('text')
            .text(d => d.name)
            .attr('x', 8)
            .attr('y', 4)
            .attr('class', 'node-label')
            .style('fill', 'var(--text-primary)');

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

        this.simulation.force('link').links(links);
        this.simulation.alpha(1).restart();
    }

    drag() {
        const dragstarted = (event, d) => {
            if (!event.active) this.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        };

        const dragged = (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        };

        const dragended = (event, d) => {
            if (!event.active) this.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        };

        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    addNode(node) {
        this.nodes.push(node);
        this.updateData(this.nodes, this.links);
    }

    addLink(link) {
        this.links.push(link);
        this.updateData(this.nodes, this.links);
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.links = this.links.filter(l => 
            l.source.id !== nodeId && l.target.id !== nodeId);
        this.updateData(this.nodes, this.links);
    }
}

// Initialize graph with sample data
document.addEventListener('DOMContentLoaded', () => {
    const graph = new KnowledgeGraph('#knowledge-graph');
    
    // Sample data
    const nodes = [
        { id: 'ai', name: 'Artificial Intelligence' },
        { id: 'ml', name: 'Machine Learning' },
        { id: 'nlp', name: 'Natural Language Processing' },
        { id: 'cv', name: 'Computer Vision' },
        { id: 'rl', name: 'Reinforcement Learning' }
    ];
    
    const links = [
        { source: 'ai', target: 'ml' },
        { source: 'ml', target: 'nlp' },
        { source: 'ml', target: 'cv' },
        { source: 'ai', target: 'rl' }
    ];
    
    graph.updateData(nodes, links);

    // Add zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        const transform = d3.zoomTransform(graph.svg.node());
        graph.svg.transition().call(
            d3.zoom().transform,
            transform.scale(transform.k * 1.2)
        );
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        const transform = d3.zoomTransform(graph.svg.node());
        graph.svg.transition().call(
            d3.zoom().transform,
            transform.scale(transform.k / 1.2)
        );
    });

    document.getElementById('reset-view').addEventListener('click', () => {
        graph.svg.transition().call(
            d3.zoom().transform,
            d3.zoomIdentity
        );
    });
});