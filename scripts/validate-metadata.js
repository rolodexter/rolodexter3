#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Configuration
const config = {
    basePath: process.cwd(),
    metadataRequired: [
        'graph-category',
        'graph-tags',
        'graph-connections',
        'graph-created',
        'graph-modified'
    ],
    metadataOptional: [
        'graph-authors',
        'graph-status',
        'graph-priority'
    ],
    defaultValues: {
        'graph-category': 'documentation',
        'graph-tags': 'tasks, updates, status',
        'graph-connections': '/memory/rolodexterVS/index.html',
        'graph-authors': 'rolodexterVS',
        'graph-status': 'active'
    }
};

// Validation Results Class
class ValidationResults {
    constructor() {
        this.processedFiles = 0;
        this.updatedFiles = 0;
        this.errors = [];
        this.warnings = [];
        this.duplicateMetaTags = [];
        this.missingAltTags = [];
        this.brokenInternalLinks = [];
    }

    addError(file, error) {
        this.errors.push({ file, error });
    }

    addWarning(file, warning) {
        this.warnings.push({ file, warning });
    }

    addDuplicateMetaTag(file, tag) {
        this.duplicateMetaTags.push({ file, tag });
    }

    addMissingAltTag(file, imgSrc) {
        this.missingAltTags.push({ file, imgSrc });
    }

    addBrokenInternalLink(file, link) {
        this.brokenInternalLinks.push({ file, link });
    }

    printReport() {
        console.log('\n🔍 Metadata Validation Report');
        console.log('==========================');
        console.log(`📄 Total Files Processed: ${this.processedFiles}`);
        console.log(`✏️ Files Updated: ${this.updatedFiles}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ Critical Errors:');
            this.errors.forEach(({ file, error }) => {
                console.log(`   - ${file}: ${error}`);
            });
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.warnings.forEach(({ file, warning }) => {
                console.log(`   - ${file}: ${warning}`);
            });
        }

        if (this.duplicateMetaTags.length > 0) {
            console.log('\n🔄 Duplicate Meta Tags:');
            this.duplicateMetaTags.forEach(({ file, tag }) => {
                console.log(`   - ${file}: Duplicate tag "${tag}"`);
            });
        }

        if (this.missingAltTags.length > 0) {
            console.log('\n🖼️ Missing Alt Tags:');
            this.missingAltTags.forEach(({ file, imgSrc }) => {
                console.log(`   - ${file}: Missing alt text for image "${imgSrc}"`);
            });
        }

        if (this.brokenInternalLinks.length > 0) {
            console.log('\n🔗 Broken Internal Links:');
            this.brokenInternalLinks.forEach(({ file, link }) => {
                console.log(`   - ${file}: Broken link "${link}"`);
            });
        }

        if (this.isValid()) {
            console.log('\n✨ All files have valid knowledge graph metadata!');
            if (this.warnings.length > 0) {
                console.log('   (with non-critical warnings)');
            }
        }
    }

    isValid() {
        return this.errors.length === 0;
    }
}

// Utility function to get current timestamp in ISO format
function getCurrentTimestamp() {
    return new Date().toISOString();
}

// Function to check for duplicate meta tags
function checkDuplicateMetaTags(dom, results, filePath) {
    const metaTags = {};
    dom.window.document.querySelectorAll('meta[name]').forEach(tag => {
        const name = tag.getAttribute('name');
        if (metaTags[name]) {
            results.addDuplicateMetaTag(filePath, name);
        }
        metaTags[name] = true;
    });
}

// Function to check for missing alt tags
function checkMissingAltTags(dom, results, filePath) {
    dom.window.document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('alt') || img.getAttribute('alt').trim() === '') {
            results.addMissingAltTag(filePath, img.getAttribute('src'));
        }
    });
}

// Function to check for broken internal links
function checkInternalLinks(dom, results, filePath) {
    const baseDir = path.dirname(filePath);
    dom.window.document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
            const absolutePath = path.resolve(baseDir, href);
            if (!fs.existsSync(absolutePath)) {
                results.addBrokenInternalLink(filePath, href);
            }
        }
    });
}

// Function to validate metadata in a file
function validateMetadata(filePath, results) {
    const content = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(content);
    const missing = [];
    const metaTags = new Set();

    // Check required metadata
    config.metadataRequired.forEach(tag => {
        const elements = dom.window.document.querySelectorAll(`meta[name="${tag}"]`);
        if (elements.length === 0) {
            missing.push(tag);
        }
        if (elements.length > 1) {
            results.addDuplicateMetaTag(filePath, tag);
        }
    });

    // Check optional metadata
    config.metadataOptional.forEach(tag => {
        const elements = dom.window.document.querySelectorAll(`meta[name="${tag}"]`);
        if (elements.length === 0) {
            results.addWarning(filePath, `Optional meta tag "${tag}" is missing`);
        }
        if (elements.length > 1) {
            results.addDuplicateMetaTag(filePath, tag);
        }
    });

    // Additional checks
    checkDuplicateMetaTags(dom, results, filePath);
    checkMissingAltTags(dom, results, filePath);
    checkInternalLinks(dom, results, filePath);

    return {
        missing,
        isValid: missing.length === 0
    };
}

// Function to update metadata timestamps
function updateTimestamps(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const modifiedTimestamp = getCurrentTimestamp();

    // Update graph-modified timestamp
    content = content.replace(
        /<meta name="graph-modified" content="[^"]*">/,
        `<meta name="graph-modified" content="${modifiedTimestamp}">`
    );

    // Add graph-modified if it doesn't exist
    if (!content.includes('graph-modified')) {
        const insertPoint = content.indexOf('</head>');
        if (insertPoint !== -1) {
            content = content.slice(0, insertPoint) +
                     `    <meta name="graph-modified" content="${modifiedTimestamp}">\n` +
                     content.slice(insertPoint);
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return true;
}

// Function to add missing metadata
function addMissingMetadata(filePath, missingTags) {
    let content = fs.readFileSync(filePath, 'utf8');
    const currentTimestamp = getCurrentTimestamp();
    let metadataToAdd = '';

    missingTags.forEach(tag => {
        let value = config.defaultValues[tag];
        if (tag === 'graph-created' || tag === 'graph-modified') {
            value = currentTimestamp;
        }
        metadataToAdd += `    <meta name="${tag}" content="${value}">\n`;
    });

    // Insert metadata before </head>
    const insertPoint = content.indexOf('</head>');
    if (insertPoint !== -1) {
        content = content.slice(0, insertPoint) + metadataToAdd + content.slice(insertPoint);
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    }
    return false;
}

// Main function to process files
async function processFiles(pattern = '**/*.html') {
    let files;
    try {
        files = await glob(pattern, { 
            cwd: config.basePath,
            ignore: ['node_modules/**', 'dist/**'],
            absolute: true
        });

        if (!Array.isArray(files) || files.length === 0) {
            console.warn(`⚠️ No files found matching pattern: ${pattern}`);
            return new ValidationResults();
        }

        const results = new ValidationResults();

        for (const filePath of files) {
            try {
                // Validate metadata
                const validation = validateMetadata(filePath, results);
                
                if (!validation.isValid) {
                    // Add missing metadata
                    if (addMissingMetadata(filePath, validation.missing)) {
                        results.updatedFiles++;
                    }
                }

                // Update timestamps
                if (updateTimestamps(filePath)) {
                    results.updatedFiles++;
                }

                results.processedFiles++;
            } catch (error) {
                results.addError(filePath, error.message);
            }
        }

        return results;
    } catch (error) {
        console.error('❌ Error while globbing files:', error);
        const results = new ValidationResults();
        results.addError('glob', `Failed to find files: ${error.message}`);
        return results;
    }
}

// CLI execution
if (require.main === module) {
    (async () => {
        try {
            const pattern = process.argv[2] || '**/*.html';
            const results = await processFiles(pattern);
            results.printReport();
            process.exit(results.isValid() ? 0 : 1);
        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    })();
}

module.exports = {
    processFiles,
    validateMetadata,
    updateTimestamps,
    addMissingMetadata
};