// Search functionality for the Knowledge Graph
export class GraphSearch {
    constructor(graph) {
        this.graph = graph;
        this.originalNodes = null;
        this.originalEdges = null;
        this.searchInput = document.getElementById('graph-search');
        this.categoryFilter = document.getElementById('category-filter');
        
        // Initialize event listeners
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.search(e.target.value));
        }
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', (e) => this.filterByCategory(e.target.value));
        }
    }

    search(query) {
        if (!this.originalNodes) {
            this.originalNodes = this.graph.simulation.nodes();
            this.originalEdges = this.graph.simulation.force('link').links();
        }

        if (!query) {
            this.resetSearch();
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matchedNodes = this.originalNodes.filter(node => 
            node.name.toLowerCase().includes(lowerQuery) ||
            node.metadata.tags?.toLowerCase().includes(lowerQuery) ||
            node.metadata.category?.toLowerCase().includes(lowerQuery)
        );

        const matchedNodeIds = new Set(matchedNodes.map(n => n.id));
        const matchedEdges = this.originalEdges.filter(edge =>
            matchedNodeIds.has(edge.source.id) && matchedNodeIds.has(edge.target.id)
        );

        this.updateGraph(matchedNodes, matchedEdges);
    }

    filterByCategory(category) {
        if (!this.originalNodes) {
            this.originalNodes = this.graph.simulation.nodes();
            this.originalEdges = this.graph.simulation.force('link').links();
        }

        if (!category) {
            this.resetSearch();
            return;
        }

        const matchedNodes = this.originalNodes.filter(node => 
            node.metadata.category === category
        );

        const matchedNodeIds = new Set(matchedNodes.map(n => n.id));
        const matchedEdges = this.originalEdges.filter(edge =>
            matchedNodeIds.has(edge.source.id) && matchedNodeIds.has(edge.target.id)
        );

        this.updateGraph(matchedNodes, matchedEdges);
    }

    resetSearch() {
        if (this.originalNodes && this.originalEdges) {
            this.updateGraph(this.originalNodes, this.originalEdges);
            this.originalNodes = null;
            this.originalEdges = null;
        }
    }

    updateGraph(nodes, edges) {
        // Update nodes
        const nodeElements = this.graph.g.selectAll('.node')
            .data(nodes, d => d.id);

        nodeElements.exit().remove();

        const nodeEnter = nodeElements.enter()
            .append('g')
            .attr('class', 'node')
            .call(this.graph.drag(this.graph.simulation));

        nodeEnter.append('circle')
            .attr('r', 10)
            .attr('fill', d => this.graph.getCategoryColor(d.metadata.category))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        nodeEnter.append('text')
            .attr('class', 'node-label')
            .attr('dx', 12)
            .attr('dy', '.35em')
            .text(d => d.name);

        // Update edges
        const edgeElements = this.graph.g.selectAll('.link')
            .data(edges, d => `${d.source.id}-${d.target.id}`);

        edgeElements.exit().remove();

        edgeElements.enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.sqrt(d.weight || 1));

        // Update simulation
        this.graph.simulation.nodes(nodes);
        this.graph.simulation.force('link').links(edges);
        this.graph.simulation.alpha(1).restart();
    }
} 