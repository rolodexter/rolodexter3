// Knowledge Graph Implementation
import { graphMetadata } from './graph-metadata.js';

class KnowledgeGraph {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.clusters = new Map();
        this.nodeTypes = {
            concept: { color: 'var(--neural-gold)', radius: 6 },
            article: { color: 'var(--hyperglow-cyan)', radius: 5 },
            resource: { color: 'var(--neural-purple)', radius: 4 },
            reference: { color: 'var(--text-secondary)', radius: 4 }
        };
        this.initializeGraph();
        this.processRepository();
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
        
        // Enhanced force simulation with clustering
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(d => this.getLinkDistance(d)))
            .force('charge', d3.forceManyBody().strength(d => this.getNodeCharge(d)))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d) * 1.5))
            .force('cluster', this.forceCluster());
    }

    getNodeCharge(node) {
        return node.type === 'concept' ? -150 : -100;
    }

    getLinkDistance(link) {
        return (link.source.type === 'concept' || link.target.type === 'concept') ? 100 : 60;
    }

    getNodeRadius(node) {
        const baseRadius = this.nodeTypes[node.type]?.radius || 5;
        return node.weight ? baseRadius * (1 + Math.log(node.weight)) : baseRadius;
    }

    forceCluster() {
        const strength = 0.15;
        let nodes;

        function force(alpha) {
            const centroids = new Map();
            
            // Calculate cluster centroids
            nodes.forEach(d => {
                if (d.cluster) {
                    let centroid = centroids.get(d.cluster) || { x: 0, y: 0, count: 0 };
                    centroid.x += d.x;
                    centroid.y += d.y;
                    centroid.count += 1;
                    centroids.set(d.cluster, centroid);
                }
            });

            // Apply clustering force
            centroids.forEach((centroid, cluster) => {
                const cx = centroid.x / centroid.count;
                const cy = centroid.y / centroid.count;
                nodes.forEach(d => {
                    if (d.cluster === cluster) {
                        d.vx += (cx - d.x) * strength * alpha;
                        d.vy += (cy - d.y) * strength * alpha;
                    }
                });
            });
        }

        force.initialize = (_nodes) => nodes = _nodes;
        return force;
    }

    updateData(nodes, links) {
        this.nodes = this.processNodes(nodes);
        this.links = this.processLinks(links);
        
        // Create the links with types
        const link = this.svg.selectAll('.link')
            .data(this.links)
            .join('line')
            .attr('class', d => `link ${d.type || ''}`)
            .attr('stroke', d => d.color || 'var(--hyperglow-cyan)')
            .attr('stroke-width', d => d.weight || 1)
            .attr('stroke-dasharray', d => d.type === 'reference' ? '5,5' : null)
            .attr('opacity', 0.6);

        // Enhanced nodes with types and metadata
        const node = this.svg.selectAll('.node')
            .data(this.nodes)
            .join('g')
            .attr('class', d => `node ${d.type || ''}`)
            .call(this.drag());

        // Clear existing node contents
        node.selectAll('*').remove();

        // Add node circles with dynamic styling
        node.append('circle')
            .attr('r', d => this.getNodeRadius(d))
            .attr('fill', d => this.nodeTypes[d.type]?.color || 'var(--neural-gold)')
            .attr('stroke', 'var(--hyperglow-cyan)')
            .attr('stroke-width', 2);

        // Add node labels with metadata
        node.append('text')
            .text(d => d.name)
            .attr('x', d => this.getNodeRadius(d) + 5)
            .attr('y', 4)
            .attr('class', 'node-label')
            .style('fill', 'var(--text-primary)');

        // Add metadata indicators if present
        node.filter(d => d.metadata)
            .append('circle')
            .attr('class', 'metadata-indicator')
            .attr('r', 3)
            .attr('cx', d => this.getNodeRadius(d))
            .attr('cy', -3)
            .attr('fill', 'var(--neural-purple)');

        // Update simulation
        this.simulation
            .nodes(this.nodes)
            .on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node
                    .attr('transform', d => `translate(${d.x},${d.y})`);
            });

        this.simulation.force('link').links(this.links);
        this.simulation.alpha(1).restart();
    }

    processNodes(nodes) {
        return nodes.map(node => ({
            ...node,
            type: node.type || 'concept',
            weight: node.weight || 1,
            metadata: node.metadata || null,
            cluster: node.cluster || null
        }));
    }

    processLinks(links) {
        return links.map(link => ({
            ...link,
            type: link.type || 'default',
            weight: link.weight || 1,
            color: this.getLinkColor(link)
        }));
    }

    getLinkColor(link) {
        switch (link.type) {
            case 'reference': return 'var(--text-secondary)';
            case 'dependency': return 'var(--neural-purple)';
            default: return 'var(--hyperglow-cyan)';
        }
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

    // New methods for metadata handling
    showNodeMetadata(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node?.metadata) {
            // Dispatch custom event with metadata
            this.container.node().dispatchEvent(new CustomEvent('showMetadata', {
                detail: { node, metadata: node.metadata }
            }));
        }
    }

    updateNodeMetadata(nodeId, metadata) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.metadata = { ...node.metadata, ...metadata };
            this.updateData(this.nodes, this.links);
        }
    }

    // New methods for clustering
    updateClusters() {
        this.clusters.clear();
        this.nodes.forEach(node => {
            if (node.cluster) {
                if (!this.clusters.has(node.cluster)) {
                    this.clusters.set(node.cluster, []);
                }
                this.clusters.get(node.cluster).push(node);
            }
        });
        this.simulation.force('cluster', this.forceCluster());
        this.simulation.alpha(0.3).restart();
    }

    async processRepository() {
        try {
            const response = await fetch('/api/repository/files');
            const files = await response.json();
            
            for (const file of files) {
                if (file.path.match(/\.(html|md)$/)) {
                    const meta = await this.extractFileMetadata(file.path);
                    if (meta) {
                        this.addNode({
                            id: file.path,
                            name: file.name,
                            type: this.getNodeType(file.path),
                            metadata: meta,
                            cluster: meta['graph-category'],
                            tags: meta['graph-tags'].split(',').map(t => t.trim())
                        });
                    }
                }
            }

            // Process connections after all nodes are added
            this.processConnections();
        } catch (error) {
            console.error('Error processing repository:', error);
        }
    }

    getNodeType(filepath) {
        if (filepath.includes('/docs/')) return 'documentation';
        if (filepath.includes('/research/')) return 'research';
        if (filepath.includes('/legal/')) return 'legal';
        if (filepath.match(/\.(md)$/)) return 'content';
        return 'page';
    }

    async extractFileMetadata(filepath) {
        try {
            const response = await fetch(`/api/file/metadata?path=${filepath}`);
            const content = await response.text();
            
            // Extract meta tags from HTML
            if (filepath.endsWith('.html')) {
                const metaTags = content.match(/<meta name="graph-[^>]+>/g) || [];
                return this.parseMetaTags(metaTags);
            }
            
            // Extract YAML frontmatter from MD
            if (filepath.endsWith('.md')) {
                const frontmatter = content.match(/^---\n([\s\S]*?)\n---/) || [];
                return this.parseFrontmatter(frontmatter[1]);
            }
        } catch (error) {
            console.error(`Error extracting metadata from ${filepath}:`, error);
            return null;
        }
    }

    async processConnections() {
        const nodes = Array.from(this.nodes.values());
        
        for (const node of nodes) {
            const connections = node.metadata['graph-connections']?.split(',').map(c => c.trim()) || [];
            
            for (const target of connections) {
                this.addLink({
                    source: node.id,
                    target: target,
                    type: this.getLinkType(node, target)
                });
            }
        }

        // Update visualization
        this.updateData(Array.from(this.nodes.values()), Array.from(this.links.values()));
    }

    getLinkType(source, target) {
        if (source.type === target.type) return 'related';
        if (source.type === 'documentation' || target.type === 'documentation') return 'reference';
        return 'connection';
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