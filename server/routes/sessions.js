const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Ensure directory exists
async function ensureDir(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// Save session file
router.post('/save', async (req, res) => {
    try {
        const { year, month, day, content } = req.body;
        
        if (!year || !month || !day || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Construct the directory path
        const dirPath = path.join(
            process.cwd(),
            'memory',
            'rolodexterVS',
            'memories',
            'sessions',
            year,
            month
        );

        // Ensure directory exists
        await ensureDir(dirPath);

        // Construct file path
        const filePath = path.join(dirPath, `${day}.html`);

        // Write the file
        await fs.writeFile(filePath, content, 'utf8');

        res.json({ success: true, path: filePath });
    } catch (error) {
        console.error('Error saving session file:', error);
        res.status(500).json({ error: 'Failed to save session file' });
    }
});

// Get session file
router.get('/:year/:month/:day', async (req, res) => {
    try {
        const { year, month, day } = req.params;
        
        const filePath = path.join(
            process.cwd(),
            'memory',
            'rolodexterVS',
            'memories',
            'sessions',
            year,
            month,
            `${day}.html`
        );

        const content = await fs.readFile(filePath, 'utf8');
        res.send(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Session file not found' });
        } else {
            console.error('Error reading session file:', error);
            res.status(500).json({ error: 'Failed to read session file' });
        }
    }
});

// Get recent sessions (last 7 days)
router.get('/recent', async (req, res) => {
    try {
        const baseDir = path.join(process.cwd(), 'memory', 'rolodexterVS', 'memories', 'sessions');
        const sessions = [];
        const now = new Date();
        
        // Look back 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            const year = date.getFullYear().toString();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            const filePath = path.join(baseDir, year, month, `${day}.html`);
            
            try {
                const stats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf8');
                const eventCount = (content.match(/<div class="timeline-item">/g) || []).length;
                
                sessions.push({
                    path: `${year}/${month}/${day}.html`,
                    date: `${year}-${month}-${day}`,
                    eventCount,
                    lastModified: stats.mtime
                });
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error(`Error reading session file ${filePath}:`, error);
                }
            }
        }
        
        res.json(sessions);
    } catch (error) {
        console.error('Error getting recent sessions:', error);
        res.status(500).json({ error: 'Failed to get recent sessions' });
    }
});

// Get archive structure
router.get('/archive', async (req, res) => {
    try {
        const baseDir = path.join(process.cwd(), 'memory', 'rolodexterVS', 'memories', 'sessions');
        const archive = {};
        
        // Read year directories
        const years = await fs.readdir(baseDir);
        
        for (const year of years) {
            if (year === 'index.html') continue;
            
            const yearPath = path.join(baseDir, year);
            const yearStat = await fs.stat(yearPath);
            
            if (yearStat.isDirectory()) {
                archive[year] = {};
                
                // Read month directories
                const months = await fs.readdir(yearPath);
                
                for (const month of months) {
                    if (month === 'index.html') continue;
                    
                    const monthPath = path.join(yearPath, month);
                    const monthStat = await fs.stat(monthPath);
                    
                    if (monthStat.isDirectory()) {
                        // Read day files
                        const days = await fs.readdir(monthPath);
                        archive[year][month] = days
                            .filter(day => day.endsWith('.html'))
                            .map(day => day.replace('.html', ''))
                            .sort();
                    }
                }
            }
        }
        
        res.json(archive);
    } catch (error) {
        console.error('Error getting archive structure:', error);
        res.status(500).json({ error: 'Failed to get archive structure' });
    }
});

// Get monthly sessions and stats
router.get('/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const baseDir = path.join(
            process.cwd(),
            'memory',
            'rolodexterVS',
            'memories',
            'sessions',
            year,
            month
        );

        // Get all session files for the month
        const files = await fs.readdir(baseDir);
        const sessionFiles = files.filter(f => f.endsWith('.html') && f !== 'index.html');

        const sessions = [];
        let totalEvents = 0;
        let totalSessions = 0;
        let mostActiveDay = null;
        let maxEvents = 0;

        // Process each session file
        for (const file of sessionFiles) {
            const filePath = path.join(baseDir, file);
            const stats = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf8');
            
            // Count events in the file
            const eventCount = (content.match(/<div class="timeline-item">/g) || []).length;
            const sessionCount = (content.match(/type":"session_start"/g) || []).length;
            
            totalEvents += eventCount;
            totalSessions += sessionCount;

            if (eventCount > maxEvents) {
                maxEvents = eventCount;
                mostActiveDay = file.replace('.html', '');
            }

            sessions.push({
                day: file.replace('.html', ''),
                date: `${year}-${month}-${file.replace('.html', '')}`,
                eventCount,
                sessionCount,
                lastModified: stats.mtime
            });
        }

        // Sort sessions by day
        sessions.sort((a, b) => b.day.localeCompare(a.day));

        res.json({
            sessions,
            stats: {
                totalSessions,
                totalEvents,
                activeDays: sessionFiles.length,
                mostActiveDay: mostActiveDay ? `${year}-${month}-${mostActiveDay}` : 'N/A'
            }
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json({
                sessions: [],
                stats: {
                    totalSessions: 0,
                    totalEvents: 0,
                    activeDays: 0,
                    mostActiveDay: 'N/A'
                }
            });
        } else {
            console.error('Error getting monthly sessions:', error);
            res.status(500).json({ error: 'Failed to get monthly sessions' });
        }
    }
});

module.exports = router; 