const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// List files in a directory
router.get('/list/*', async (req, res) => {
    try {
        const requestedPath = req.params[0];
        const fullPath = path.join(process.cwd(), requestedPath);
        
        // Ensure path is within allowed directories
        if (!isPathAllowed(fullPath)) {
            return res.status(403).json({ error: 'Access to this directory is not allowed' });
        }
        
        const files = await fs.readdir(fullPath);
        const fileStats = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(fullPath, file);
                const stats = await fs.stat(filePath);
                return {
                    name: file,
                    path: path.join(requestedPath, file),
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    modified: stats.mtime
                };
            })
        );
        
        res.json({
            path: requestedPath,
            files: fileStats.filter(file => 
                file.isDirectory || file.name.endsWith('.html') || file.name.endsWith('.md')
            )
        });
    } catch (error) {
        console.error('Error listing directory:', error);
        res.status(500).json({ error: 'Failed to list directory contents' });
    }
});

// Get file contents
router.get('/read/*', async (req, res) => {
    try {
        const requestedPath = req.params[0];
        const fullPath = path.join(process.cwd(), requestedPath);
        
        // Ensure path is within allowed directories
        if (!isPathAllowed(fullPath)) {
            return res.status(403).json({ error: 'Access to this file is not allowed' });
        }
        
        const content = await fs.readFile(fullPath, 'utf-8');
        res.send(content);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Failed to read file contents' });
    }
});

function isPathAllowed(fullPath) {
    // Define allowed directories relative to process.cwd()
    const allowedDirs = [
        'memory',
        'docs',
        'legal'
    ].map(dir => path.join(process.cwd(), dir));
    
    // Check if the requested path is within any allowed directory
    return allowedDirs.some(dir => fullPath.startsWith(dir));
}

module.exports = router; 