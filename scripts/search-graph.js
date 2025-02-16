// Search functionality for the Knowledge Graph
class GraphSearch {
    constructor(knowledgeGraph) {
        this.graph = knowledgeGraph;
        this.searchIndex = new Map();
        this.buildSearchIndex();
    }
    
    buildSearchIndex() {
        // Index nodes by label and tags
        this.graph.node.each((d) => {
            // Index by label
            this.addToIndex(d.id, d.label.toLowerCase());
            
            // Index by tags
            if (d.tags) {
                d.tags.forEach(tag => {
                    this.addToIndex(d.id, tag.toLowerCase());
                });
            }
            
            // Index by category
            if (d.category) {
                this.addToIndex(d.id, d.category.toLowerCase());
            }
        });
    }
    
    addToIndex(id, term) {
        if (!term) return;
        
        // Split term into words and add each to index
        term.split(/\s+/).forEach(word => {
            if (!this.searchIndex.has(word)) {
                this.searchIndex.set(word, new Set());
            }
            this.searchIndex.get(word).add(id);
        });
    }
    
    search(query) {
        if (!query) {
            this.resetHighlight();
            return [];
        }
        
        const terms = query.toLowerCase().split(/\s+/);
        const results = new Map();
        
        // Find matches for each term
        terms.forEach(term => {
            // Get exact matches
            if (this.searchIndex.has(term)) {
                this.searchIndex.get(term).forEach(id => {
                    if (!results.has(id)) {
                        results.set(id, { id, score: 1 });
                    } else {
                        results.get(id).score += 1;
                    }
                });
            }
            
            // Get partial matches
            this.searchIndex.forEach((ids, indexTerm) => {
                if (indexTerm.includes(term)) {
                    ids.forEach(id => {
                        if (!results.has(id)) {
                            results.set(id, { id, score: 0.5 });
                        } else {
                            results.get(id).score += 0.5;
                        }
                    });
                }
            });
        });
        
        // Convert results to array and sort by score
        const sortedResults = Array.from(results.values())
            .sort((a, b) => b.score - a.score);
        
        // Highlight matching nodes and their connections
        this.highlightResults(sortedResults.map(r => r.id));
        
        return sortedResults;
    }
    
    highlightResults(matchingIds) {
        const matchingSet = new Set(matchingIds);
        
        // Dim all nodes and links
        this.graph.node.attr('opacity', 0.1);
        this.graph.link.attr('opacity', 0.1);
        this.graph.text.attr('opacity', 0.1);
        
        // Highlight matching nodes and their connections
        this.graph.node.attr('opacity', d => 
            matchingSet.has(d.id) ? 1 : 0.1
        );
        
        this.graph.link.attr('opacity', d =>
            matchingSet.has(d.source.id) || matchingSet.has(d.target.id) ? 1 : 0.1
        );
        
        this.graph.text.attr('opacity', d =>
            matchingSet.has(d.id) ? 1 : 0.1
        );
    }
    
    resetHighlight() {
        // Reset all nodes and links to full opacity
        this.graph.node.attr('opacity', 1);
        this.graph.link.attr('opacity', 1);
        this.graph.text.attr('opacity', 1);
    }
    
    getRelatedNodes(nodeId, depth = 1) {
        const related = new Set([nodeId]);
        const toProcess = [[nodeId, 0]];
        
        while (toProcess.length > 0) {
            const [currentId, currentDepth] = toProcess.shift();
            
            if (currentDepth >= depth) continue;
            
            // Find connected nodes through links
            this.graph.link.each(d => {
                if (d.source.id === currentId && !related.has(d.target.id)) {
                    related.add(d.target.id);
                    toProcess.push([d.target.id, currentDepth + 1]);
                }
                if (d.target.id === currentId && !related.has(d.source.id)) {
                    related.add(d.source.id);
                    toProcess.push([d.source.id, currentDepth + 1]);
                }
            });
        }
        
        return Array.from(related);
    }
    
    filterByCategory(category) {
        if (!category) {
            this.resetHighlight();
            return;
        }
        
        const lowerCategory = category.toLowerCase();
        
        this.graph.node.attr('opacity', d =>
            d.category?.toLowerCase() === lowerCategory ? 1 : 0.1
        );
        
        this.graph.link.attr('opacity', d =>
            d.source.category?.toLowerCase() === lowerCategory ||
            d.target.category?.toLowerCase() === lowerCategory ? 1 : 0.1
        );
        
        this.graph.text.attr('opacity', d =>
            d.category?.toLowerCase() === lowerCategory ? 1 : 0.1
        );
    }
}

module.exports = GraphSearch; 