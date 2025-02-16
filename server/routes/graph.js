const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Get all repository files metadata for knowledge graph
router.get('/repository/files', async (req, res) => {
    try {
        const files = [];
        await scanDirectory('', files);
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get metadata for a specific file
router.get('/file/metadata', async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const fullPath = path.join(process.cwd(), filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        const metadata = await extractMetadata(content, path.extname(filePath));
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function scanDirectory(dir, files) {
    const targetDir = path.join(process.cwd(), dir);
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            if (!isExcludedDirectory(entry.name)) {
                await scanDirectory(fullPath, files);
            }
        } else if (isTargetFile(entry.name)) {
            files.push({
                path: fullPath.replace(/\\/g, '/'),
                name: entry.name
            });
        }
    }
}

function isTargetFile(filename) {
    return /\.(html|md)$/.test(filename);
}

function isExcludedDirectory(dirname) {
    return /^(\.git|node_modules|dist|build)$/.test(dirname);
}

async function extractMetadata(content, ext) {
    if (ext === '.html') {
        return extractHtmlMetadata(content);
    } else if (ext === '.md') {
        return extractMdMetadata(content);
    }
    return {};
}

function extractHtmlMetadata(content) {
    const metadata = {};
    const metaTags = content.match(/<meta name="graph-[^>]+>/g) || [];
    
    metaTags.forEach(tag => {
        const name = tag.match(/name="graph-([^"]+)"/)?.[1];
        const content = tag.match(/content="([^"]+)"/)?.[1];
        if (name && content) {
            metadata[name] = content;
        }
    });
    
    return metadata;
}

function extractMdMetadata(content) {
    const metadata = {};
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
    
    frontmatter.split('\n').forEach(line => {
        const [key, ...values] = line.split(':').map(s => s.trim());
        if (key && values.length && key.startsWith('graph-')) {
            metadata[key.replace('graph-', '')] = values.join(':');
        }
    });
    
    return metadata;
}

module.exports = router;