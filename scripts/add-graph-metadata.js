#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const DEFAULT_METADATA = {
    'community': {
        tags: 'community, collaboration, discussion',
        category: 'community',
        connections: 'index.html, knowledge/index.html'
    },
    'research': {
        tags: 'research, analysis, findings',
        category: 'research',
        connections: 'index.html, labs/index.html'
    },
    'labs': {
        tags: 'experiments, demos, prototypes',
        category: 'labs',
        connections: 'index.html, research/index.html'
    },
    'legal': {
        tags: 'legal, policy, terms',
        category: 'legal',
        connections: 'index.html'
    },
    'knowledge': {
        tags: 'knowledge-base, documentation, guides',
        category: 'documentation',
        connections: 'index.html, docs/knowledge-graph.md'
    }
};

async function addMetadataToFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const dom = new JSDOM(content);
    const doc = dom.window.document;
    const head = doc.head || doc.getElementsByTagName('head')[0];

    // Get section from filepath
    const section = filePath.split(path.sep)[0];
    const defaultMeta = DEFAULT_METADATA[section] || {
        tags: 'content, page',
        category: 'content',
        connections: 'index.html'
    };

    // Required meta tags
    const requiredMeta = {
        'graph-tags': defaultMeta.tags,
        'graph-category': defaultMeta.category,
        'graph-connections': defaultMeta.connections,
        'graph-created': new Date().toISOString(),
        'graph-modified': new Date().toISOString()
    };

    // Add missing meta tags
    for (const [name, content] of Object.entries(requiredMeta)) {
        if (!doc.querySelector(`meta[name="${name}"]`)) {
            const meta = doc.createElement('meta');
            meta.setAttribute('name', name);
            meta.setAttribute('content', content);
            head.appendChild(meta);
        }
    }

    await fs.writeFile(filePath, dom.serialize());
    console.log(`Updated metadata for ${filePath}`);
}

async function processDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && 
                !['node_modules', 'dist', 'build'].includes(entry.name)) {
                await processDirectory(fullPath);
            }
        } else if (entry.name.endsWith('.html')) {
            await addMetadataToFile(fullPath);
        }
    }
}

async function main() {
    try {
        await processDirectory('.');
        console.log('Finished adding metadata to all HTML files');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();