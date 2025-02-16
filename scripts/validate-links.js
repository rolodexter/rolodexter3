const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

class LinkValidator {
    constructor(options = {}) {
        this.options = {
            baseDir: process.cwd(),
            excludeDirs: ['node_modules', '.git'],
            fileTypes: ['.html', '.md'],
            checkExternal: true,
            ...options
        };
        this.results = {
            internal: { valid: [], invalid: [] },
            external: { valid: [], invalid: [] }
        };
    }

    async validateLinks() {
        try {
            const files = await this.findFiles(this.options.baseDir);
            for (const file of files) {
                await this.processFile(file);
            }
            return this.generateReport();
        } catch (error) {
            console.error('Error validating links:', error);
            throw error;
        }
    }

    async findFiles(dir) {
        const files = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                if (!this.options.excludeDirs.includes(entry.name)) {
                    files.push(...await this.findFiles(fullPath));
                }
            } else if (this.options.fileTypes.some(ext => entry.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }

        return files;
    }

    async processFile(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const links = this.extractLinks(content);
        
        for (const link of links) {
            if (this.isExternalLink(link)) {
                if (this.options.checkExternal) {
                    await this.validateExternalLink(link, filePath);
                }
            } else {
                await this.validateInternalLink(link, filePath);
            }
        }

        // Add validation for deprecated content
        if (this.isDeprecatedFile(filePath)) {
            this.validateDeprecatedMetadata(filePath);
            this.validateSuccessorLink(filePath);
        }
    }

    extractLinks(content) {
        const links = new Set();
        
        // HTML links
        const htmlLinks = content.match(/href=["'](.*?)["']/g) || [];
        htmlLinks.forEach(link => {
            const href = link.match(/href=["'](.*?)["']/)[1];
            links.add(href);
        });

        // Markdown links
        const mdLinks = content.match(/\[.*?\]\((.*?)\)/g) || [];
        mdLinks.forEach(link => {
            const href = link.match(/\[(.*?)\]\((.*?)\)/)[2];
            links.add(href);
        });

        return Array.from(links);
    }

    isExternalLink(link) {
        return link.startsWith('http://') || link.startsWith('https://');
    }

    async validateInternalLink(link, sourceFile) {
        try {
            const basePath = path.dirname(sourceFile);
            const targetPath = path.resolve(basePath, link);
            
            await fs.access(targetPath);
            this.results.internal.valid.push({ link, sourceFile });
        } catch {
            this.results.internal.invalid.push({ link, sourceFile });
        }
    }

    async validateExternalLink(link, sourceFile) {
        try {
            const response = await fetch(link, { method: 'HEAD' });
            if (response.ok) {
                this.results.external.valid.push({ link, sourceFile });
            } else {
                this.results.external.invalid.push({ 
                    link, 
                    sourceFile, 
                    status: response.status 
                });
            }
        } catch (error) {
            this.results.external.invalid.push({ 
                link, 
                sourceFile, 
                error: error.message 
            });
        }
    }

    isDeprecatedFile(filePath) {
        return filePath.includes('/deprecated/') || 
               document.querySelector('meta[name="graph-status"][content="deprecated"]');
    }

    validateDeprecatedMetadata(filePath) {
        const requiredMetaTags = [
            'graph-status',
            'graph-successor',
            'graph-archived',
            'graph-archive-date'
        ];
        // ...validation logic...
    }

    validateSuccessorLink(filePath) {
        const successor = document.querySelector('meta[name="graph-successor"]')?.content;
        if (successor) {
            this.validateFileExists(successor);
        }
    }

    generateReport() {
        return {
            summary: {
                internal: {
                    valid: this.results.internal.valid.length,
                    invalid: this.results.internal.invalid.length
                },
                external: {
                    valid: this.results.external.valid.length,
                    invalid: this.results.external.invalid.length
                }
            },
            invalid: {
                internal: this.results.internal.invalid,
                external: this.results.external.invalid
            }
        };
    }
}

// Export for use in other scripts and CI/CD
module.exports = LinkValidator;

// Run directly from command line
if (require.main === module) {
    const validator = new LinkValidator();
    validator.validateLinks()
        .then(report => {
            console.log('\nLink Validation Report:');
            console.log(JSON.stringify(report, null, 2));
            
            const totalInvalid = report.summary.internal.invalid + 
                               report.summary.external.invalid;
            
            if (totalInvalid > 0) {
                console.error('\n❌ Found invalid links. Please review the report.');
                process.exit(1);
            }
            
            console.log('\n✅ All links are valid.');
        })
        .catch(error => {
            console.error('Error running link validation:', error);
            process.exit(1);
        });
}