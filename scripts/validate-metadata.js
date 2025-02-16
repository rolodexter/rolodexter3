#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const REQUIRED_META_TAGS = [
    'graph-category',
    'graph-tags',
    'graph-connections',
    'graph-created',
    'graph-modified'
];

const VALID_CATEGORIES = [
    'core',
    'documentation',
    'research',
    'feature',
    'legal',
    'community',
    'labs'
];

async function validateFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const dom = new JSDOM(content);
    const metaTags = dom.window.document.querySelectorAll('meta[name^="graph-"]');
    const issues = [];
    
    // Check for required meta tags
    const foundTags = new Set();
    metaTags.forEach(tag => {
        const name = tag.getAttribute('name');
        foundTags.add(name);
        
        // Validate category values
        if (name === 'graph-category') {
            const category = tag.getAttribute('content');
            if (!VALID_CATEGORIES.includes(category)) {
                issues.push(`Invalid category: ${category}`);
            }
        }
        
        // Validate connections format
        if (name === 'graph-connections') {
            const connections = tag.getAttribute('content').split(',').map(c => c.trim());
            connections.forEach(conn => {
                if (!conn.endsWith('.html') && !conn.endsWith('.md')) {
                    issues.push(`Invalid connection format: ${conn}`);
                }
            });
        }
        
        // Validate dates
        if (name === 'graph-created' || name === 'graph-modified') {
            const date = new Date(tag.getAttribute('content'));
            if (isNaN(date.getTime())) {
                issues.push(`Invalid date in ${name}: ${tag.getAttribute('content')}`);
            }
        }
    });
    
    // Check for missing required tags
    REQUIRED_META_TAGS.forEach(tag => {
        if (!foundTags.has(tag)) {
            issues.push(`Missing required meta tag: ${tag}`);
        }
    });
    
    return {
        filePath: filePath,
        issues: issues
    };
}

async function validateDirectory(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const results = [];
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            if (!file.name.startsWith('.') && file.name !== 'node_modules') {
                results.push(...await validateDirectory(fullPath));
            }
        } else if (file.name.endsWith('.html')) {
            results.push(await validateFile(fullPath));
        }
    }
    
    return results;
}

async function main() {
    try {
        const results = await validateDirectory(process.cwd());
        let hasIssues = false;
        
        results.forEach(result => {
            if (result.issues.length > 0) {
                hasIssues = true;
                console.log(`\n${result.filePath}:`);
                result.issues.forEach(issue => {
                    console.log(`  - ${issue}`);
                });
            }
        });
        
        if (hasIssues) {
            process.exit(1);
        } else {
            console.log('\nAll files have valid knowledge graph metadata! ✨');
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();