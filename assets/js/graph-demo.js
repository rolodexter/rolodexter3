// Knowledge Graph Demo & Test Data
class KnowledgeGraphDemo {
    constructor(graphInstance) {
        this.graph = graphInstance;
        this.testData = {
            concepts: [
                { id: 'ai', name: 'Artificial Intelligence', weight: 5, cluster: 'core' },
                { id: 'ml', name: 'Machine Learning', weight: 4, cluster: 'core' },
                { id: 'nlp', name: 'Natural Language Processing', weight: 3, cluster: 'language' }
            ],
            articles: [
                {
                    id: 'intro_ai',
                    name: 'Introduction to AI',
                    type: 'article',
                    cluster: 'core',
                    metadata: {
                        author: 'Dr. Smith',
                        date: '2025-01-15',
                        citations: 12
                    }
                },
                {
                    id: 'nlp_basics',
                    name: 'NLP Fundamentals',
                    type: 'article',
                    cluster: 'language',
                    metadata: {
                        author: 'Dr. Johnson',
                        date: '2025-02-01',
                        citations: 8
                    }
                }
            ],
            resources: [
                {
                    id: 'python_ml',
                    name: 'Python ML Library',
                    type: 'resource',
                    cluster: 'tools',
                    metadata: {
                        version: '2.1.0',
                        stars: 1200,
                        language: 'Python'
                    }
                },
                {
                    id: 'nlp_dataset',
                    name: 'Language Dataset',
                    type: 'resource',
                    cluster: 'language',
                    metadata: {
                        size: '2.3GB',
                        entries: 50000,
                        format: 'JSON'
                    }
                }
            ],
            references: [
                {
                    id: 'ai_paper',
                    name: 'AI Research Paper',
                    type: 'reference',
                    cluster: 'core',
                    metadata: {
                        doi: '10.1234/ai.2025',
                        journal: 'AI Review',
                        year: 2025
                    }
                }
            ]
        };
        
        this.testLinks = [
            { source: 'ai', target: 'ml', type: 'dependency' },
            { source: 'ml', target: 'nlp', type: 'dependency' },
            { source: 'intro_ai', target: 'ai', type: 'reference' },
            { source: 'nlp_basics', target: 'nlp', type: 'reference' },
            { source: 'python_ml', target: 'ml', type: 'resource' },
            { source: 'nlp_dataset', target: 'nlp', type: 'resource' },
            { source: 'ai_paper', target: 'ai', type: 'reference' }
        ];
    }

    populateGraph() {
        // Combine all nodes
        const allNodes = [
            ...this.testData.concepts,
            ...this.testData.articles,
            ...this.testData.resources,
            ...this.testData.references
        ];

        // Update graph with test data
        this.graph.updateData(allNodes, this.testLinks);
        
        // Update clusters
        this.graph.updateClusters();
        
        return {
            nodeCount: allNodes.length,
            linkCount: this.testLinks.length,
            clusters: [...new Set(allNodes.map(n => n.cluster))]
        };
    }

    addRandomNode() {
        const types = ['article', 'resource', 'reference'];
        const type = types[Math.floor(Math.random() * types.length)];
        const clusters = ['core', 'language', 'tools'];
        const cluster = clusters[Math.floor(Math.random() * clusters.length)];
        
        const newNode = {
            id: `node_${Date.now()}`,
            name: `Test ${type} ${Date.now()}`,
            type,
            cluster,
            metadata: {
                created: new Date().toISOString(),
                automated: true
            }
        };

        // Find a random existing node to link to
        const existingNode = this.graph.nodes[
            Math.floor(Math.random() * this.graph.nodes.length)
        ];

        const newLink = {
            source: newNode.id,
            target: existingNode.id,
            type: type === 'reference' ? 'reference' : 'dependency'
        };

        this.graph.addNode(newNode);
        this.graph.addLink(newLink);
        this.graph.updateClusters();
    }

    simulateActivity(interval = 5000) {
        return setInterval(() => this.addRandomNode(), interval);
    }
}

// Initialize demo when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const graph = new KnowledgeGraph('#knowledge-graph');
    const demo = new KnowledgeGraphDemo(graph);
    
    // Populate initial data
    const stats = demo.populateGraph();
    console.log('Graph populated with:', stats);

    // Add demo controls
    const controls = document.createElement('div');
    controls.className = 'graph-demo-controls';
    controls.innerHTML = `
        <button id="add-node">Add Random Node</button>
        <button id="toggle-simulation">Start Simulation</button>
        <div class="stats">
            <span>Nodes: ${stats.nodeCount}</span>
            <span>Links: ${stats.linkCount}</span>
            <span>Clusters: ${stats.clusters.length}</span>
        </div>
    `;

    document.querySelector('.graph-controls').appendChild(controls);

    // Add event listeners
    let simulationInterval = null;
    
    document.getElementById('add-node').addEventListener('click', () => {
        demo.addRandomNode();
    });

    document.getElementById('toggle-simulation').addEventListener('click', (e) => {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            e.target.textContent = 'Start Simulation';
        } else {
            simulationInterval = demo.simulateActivity();
            e.target.textContent = 'Stop Simulation';
        }
    });
});