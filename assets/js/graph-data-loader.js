export class GraphDataLoader {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.processedFiles = new Set();
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.isLoading = false;
        this.baseDirectories = [
            'memory/rolodexterVS/tasks',
            'memory/rolodexterVS/memories',
            'memory/rolodexterVS',
            'memory',
            'docs',
            'legal'
        ];
    }

    async loadDirectory(baseUrl = '') {
        try {
            this.isLoading = true;
            
            // Load files from each base directory
            for (const dir of this.baseDirectories) {
                try {
                    // Use local file system path
                    const dirPath = `${dir}/`;
                    
                    // Get list of HTML files in directory
                    const files = await this.getLocalFiles(dirPath);
                    
                    if (!files || files.length === 0) {
                        this.logWarning(`No HTML files found in directory: ${dir}`);
                        continue;
                    }
                    
                    // Process files in parallel with error handling
                    const results = await Promise.allSettled(files.map(file => this.loadPage(`${dirPath}${file}`)));
                    
                    // Log only actual errors
                    results.forEach((result, index) => {
                        if (result.status === 'rejected') {
                            this.logWarning(`Failed to load ${files[index]}: ${result.reason}`);
                        }
                    });
                } catch (error) {
                    this.logWarning(`Error loading directory ${dir}:`, error);
                    continue;
                }
            }

            // Create edges after all nodes are loaded
            this.createEdges();
            
            if (this.nodes.size === 0) {
                throw new Error('No valid nodes found in any directory');
            }
            
            return this.getGraphData();
        } catch (error) {
            this.logError('Error loading directories:', error);
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                this.logWarning(`Retrying directory load (${this.retryAttempts}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.retryAttempts * 1000));
                return this.loadDirectory(baseUrl);
            }
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async loadPage(url) {
        if (this.processedFiles.has(url)) {
            return; // Skip already processed files
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    return; // Silently skip 404s for optional files
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            let metadata;
            
            if (url.endsWith('.md')) {
                metadata = this.extractMarkdownMetadata(text);
            } else {
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                metadata = this.extractHTMLMetadata(doc);
            }
            
            if (!metadata) return; // Skip if no valid metadata
            
            // Create node
            const id = new URL(url).pathname;
            const name = metadata.title || this.getFilenameFromPath(id);
            const node = { id, name, metadata };
            this.nodes.set(id, node);
            
            this.processedFiles.add(url);
        } catch (error) {
            if (error.message.includes('404')) {
                return; // Silently ignore 404s
            }
            this.logWarning(`Error loading page ${url}:`, error);
            throw error;
        }
    }

    extractHTMLMetadata(doc) {
        const metadata = {};
        const metaTags = doc.querySelectorAll('meta[name^="graph-"]');
        
        if (metaTags.length === 0) {
            return null; // Skip files without graph metadata
        }

        // Get title
        metadata.title = doc.querySelector('title')?.textContent;

        metaTags.forEach(tag => {
            const name = tag.getAttribute('name').replace('graph-', '');
            metadata[name] = tag.getAttribute('content') || this.getDefaultValue(name);
        });

        return this.normalizeMetadata(metadata);
    }

    extractMarkdownMetadata(text) {
        const metadata = {};
        const frontMatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
        
        if (!frontMatterMatch) {
            return null;
        }

        const frontMatter = frontMatterMatch[1];
        const lines = frontMatter.split('\n');
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                const value = valueParts.join(':').trim();
                metadata[key.trim()] = value;
            }
        });

        // Extract title from first heading if not in frontmatter
        if (!metadata.title) {
            const titleMatch = text.match(/^#\s+(.+)$/m);
            if (titleMatch) {
                metadata.title = titleMatch[1];
            }
        }

        return this.normalizeMetadata(metadata);
    }

    normalizeMetadata(metadata) {
        // Ensure required metadata fields have values
        const normalized = {
            title: metadata.title || '',
            category: metadata.category || 'uncategorized',
            tags: metadata.tags || '',
            connections: this.validateConnections(metadata.connections),
            created: metadata.created || new Date().toISOString(),
            modified: metadata.modified || metadata.created,
            authors: metadata.authors || 'unknown',
            status: metadata.status || 'active'
        };

        return normalized;
    }

    validateConnections(connections) {
        if (!connections) return '';
        
        return connections.split(',')
            .map(conn => conn.trim())
            .filter(conn => {
                if (!conn.endsWith('.html') && !conn.endsWith('.md')) {
                    this.logWarning(`Invalid connection format: ${conn}`);
                    return false;
                }
                return true;
            })
            .join(',');
    }

    createEdges() {
        this.edges = [];
        this.nodes.forEach(node => {
            if (node.metadata.connections) {
                const connections = node.metadata.connections.split(',').map(c => c.trim());
                connections.forEach(target => {
                    // Handle both .html and .md extensions
                    const targetHtml = target.replace('.md', '.html');
                    const targetMd = target.replace('.html', '.md');
                    
                    if (this.nodes.has(target) || this.nodes.has(targetHtml) || this.nodes.has(targetMd)) {
                        this.edges.push({
                            source: node.id,
                            target: this.nodes.has(target) ? target : 
                                   this.nodes.has(targetHtml) ? targetHtml : targetMd,
                            weight: 1
                        });
                    }
                });
            }
        });
    }

    getGraphData() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges
        };
    }

    getDefaultValue(field) {
        const defaults = {
            category: 'uncategorized',
            tags: '',
            connections: '',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            authors: 'unknown',
            status: 'active'
        };
        return defaults[field] || '';
    }

    getFilenameFromPath(path) {
        const parts = path.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.(html|md)$/, '');
    }

    logError(message, error) {
        console.error(`[GraphDataLoader] ${message}`, error);
    }

    logWarning(message, data = '') {
        console.warn(`[GraphDataLoader] ${message}`, data);
    }

    reset() {
        this.nodes.clear();
        this.edges = [];
        this.processedFiles.clear();
        this.retryAttempts = 0;
        this.isLoading = false;
    }

    async getLocalFiles(dirPath) {
        try {
            // This is a placeholder - in a real implementation, you would need to
            // implement directory listing for local files, possibly using a backend API
            // For now, we'll return an empty array to prevent errors
            return [];
        } catch (error) {
            this.logWarning(`Error listing directory ${dirPath}:`, error);
            return [];
        }
    }
} 