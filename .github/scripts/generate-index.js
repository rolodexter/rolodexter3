const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const EXCLUDED_DIRS = ['.git', '.github', 'node_modules', 'dist', 'build'];
const INCLUDED_EXTENSIONS = ['.md', '.txt', '.json'];

async function generateIndex() {
    try {
        const commitInfo = getCommitInfo();
        const index = {
            version: commitInfo.hash,
            generated: new Date().toISOString(),
            config: {
                cacheExpiry: 3600, // 1 hour in seconds
                forceRefresh: process.env.FORCE_REFRESH === 'true',
                debug: process.env.DEBUG_MODE === 'true'
            },
            metadata: {
                totalFiles: 0,
                totalDirectories: 0,
                lastCommit: commitInfo.hash,
                branch: commitInfo.branch
            },
            structure: {}
        };

        // Start from the root directory
        const rootDir = process.cwd();
        index.structure = await scanDirectory(rootDir, rootDir);

        // Calculate totals
        const totals = calculateTotals(index.structure);
        index.metadata.totalFiles = totals.files;
        index.metadata.totalDirectories = totals.directories;

        // Write the index file
        const outputPath = path.join(rootDir, 'assets', 'data', 'index.json');
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, JSON.stringify(index, null, 2));

        console.log('✅ Index generation successful');
        console.log(`📊 Generated index with ${totals.files} files in ${totals.directories} directories`);
        return true;
    } catch (error) {
        console.error('❌ Index generation failed:', error.message);
        process.exit(1);
    }
}

function getCommitInfo() {
    try {
        const hash = execSync('git rev-parse HEAD').toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        return { hash, branch };
    } catch (error) {
        console.warn('⚠️ Unable to get git info:', error.message);
        return { hash: 'unknown', branch: 'unknown' };
    }
}

async function scanDirectory(rootDir, currentDir) {
    const structure = {};
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    // Group files and directories
    const files = {};
    const directories = [];

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(rootDir, fullPath);

        // Skip excluded directories and hidden files
        if (entry.name.startsWith('.') || EXCLUDED_DIRS.includes(entry.name)) {
            continue;
        }

        if (entry.isDirectory()) {
            directories.push(entry.name);
            structure[entry.name] = await scanDirectory(rootDir, fullPath);
        } else if (entry.isFile() && INCLUDED_EXTENSIONS.includes(path.extname(entry.name))) {
            const content = await fs.readFile(fullPath, 'utf-8');
            const metadata = await extractMetadata(content, entry.name);
            files[entry.name] = {
                ...metadata,
                checksum: calculateChecksum(content),
                version: getFileCommitHash(relativePath)
            };
        }
    }

    if (Object.keys(files).length > 0) {
        structure.files = files;
    }
    if (directories.length > 0) {
        structure.directories = directories;
    }

    return structure;
}

async function extractMetadata(content, filename) {
    // Default metadata
    const metadata = {
        title: path.parse(filename).name,
        category: 'uncategorized',
        modified: new Date().toISOString()
    };

    // Try to extract front matter if it exists
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
        const frontMatter = frontMatterMatch[1];
        const lines = frontMatter.split('\n');
        for (const line of lines) {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                metadata[key] = value;
            }
        }
    }

    return metadata;
}

function calculateChecksum(content) {
    return `sha256-${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function getFileCommitHash(relativePath) {
    try {
        return execSync(`git log -n 1 --pretty=format:%H -- "${relativePath}"`).toString().trim();
    } catch (error) {
        console.warn(`⚠️ Unable to get commit hash for ${relativePath}:`, error.message);
        return 'unknown';
    }
}

function calculateTotals(structure) {
    const totals = { files: 0, directories: 0 };

    function traverse(node) {
        if (node.files) {
            totals.directories++;
            totals.files += Object.keys(node.files).length;
        }
        if (node.directories) {
            for (const dir of node.directories) {
                if (node[dir]) {
                    traverse(node[dir]);
                }
            }
        }
    }

    traverse(structure);
    return totals;
}

// Run generation if called directly
if (require.main === module) {
    generateIndex(); 