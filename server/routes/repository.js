const { Router } = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = Router();

// Get list of repository files with metadata
router.get('/files', async (req, res) => {
    try {
        const rootDir = path.join(__dirname, '../../');
        const files = await walkDirectory(rootDir);
        res.json(files);
    } catch (error) {
        console.error('Error listing repository files:', error);
        res.status(500).json({ error: 'Failed to list repository files' });
    }
});

// Get metadata for a specific file
router.get('/file/metadata', async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const fullPath = path.join(__dirname, '../../', filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const metadata = await extractMetadata(content, path.extname(filePath));
        
        res.json(metadata);
    } catch (error) {
        console.error('Error reading file metadata:', error);
        res.status(500).json({ error: 'Failed to read file metadata' });
    }
});

// Helper function to walk directory recursively
async function walkDirectory(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(path.join(__dirname, '../../'), fullPath);

        if (entry.isDirectory()) {
            const subFiles = await walkDirectory(fullPath);
            files.push(...subFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.html'))) {
            files.push({
                path: relativePath.replace(/\\/g, '/'),
                name: entry.name,
                type: entry.name.endsWith('.md') ? 'markdown' : 'html'
            });
        }
    }

    return files;
}

// Helper function to extract metadata from files
async function extractMetadata(content, fileExt) {
    const metadata = {
        'graph-category': '',
        'graph-tags': '',
        'graph-connections': ''
    };

    if (fileExt === '.html') {
        // Extract meta tags
        const categoryMatch = content.match(/<meta name="graph-category" content="([^"]+)">/);
        const tagsMatch = content.match(/<meta name="graph-tags" content="([^"]+)">/);
        const connectionsMatch = content.match(/<meta name="graph-connections" content="([^"]+)">/);

        if (categoryMatch) metadata['graph-category'] = categoryMatch[1];
        if (tagsMatch) metadata['graph-tags'] = tagsMatch[1];
        if (connectionsMatch) metadata['graph-connections'] = connectionsMatch[1];
    } else if (fileExt === '.md') {
        // Extract YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const categoryMatch = frontmatter.match(/graph-category:\s*(.+)/);
            const tagsMatch = frontmatter.match(/graph-tags:\s*(.+)/);
            const connectionsMatch = frontmatter.match(/graph-connections:\s*(.+)/);

            if (categoryMatch) metadata['graph-category'] = categoryMatch[1].trim();
            if (tagsMatch) metadata['graph-tags'] = tagsMatch[1].trim();
            if (connectionsMatch) metadata['graph-connections'] = connectionsMatch[1].trim();
        }
    }

    return metadata;
}

module.exports = router;