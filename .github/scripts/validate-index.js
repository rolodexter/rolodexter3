const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const REQUIRED_FIELDS = {
    root: ['version', 'generated', 'config', 'structure', 'metadata'],
    config: ['cacheExpiry', 'forceRefresh', 'debug'],
    metadata: ['totalFiles', 'totalDirectories', 'lastCommit', 'branch'],
    file: ['title', 'category', 'modified', 'checksum', 'version']
};

const VALID_CATEGORIES = [
    'documentation',
    'core',
    'research',
    'feature',
    'legal',
    'community',
    'labs',
    'uncategorized'
];

async function validateIndex() {
    try {
        // Read index.json
        const indexPath = path.join(process.cwd(), 'assets', 'data', 'index.json');
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(indexContent);

        // Validate root structure
        validateFields(index, REQUIRED_FIELDS.root, 'root');
        validateFields(index.config, REQUIRED_FIELDS.config, 'config');
        validateFields(index.metadata, REQUIRED_FIELDS.metadata, 'metadata');

        // Validate structure
        await validateStructure(index.structure);

        // Validate totals
        const totals = await calculateTotals(index.structure);
        if (totals.files !== index.metadata.totalFiles) {
            throw new Error(`Total files mismatch: found ${totals.files}, metadata claims ${index.metadata.totalFiles}`);
        }
        if (totals.directories !== index.metadata.totalDirectories) {
            throw new Error(`Total directories mismatch: found ${totals.directories}, metadata claims ${index.metadata.totalDirectories}`);
        }

        console.log('✅ Index validation successful');
        return true;
    } catch (error) {
        console.error('❌ Index validation failed:', error.message);
        process.exit(1);
    }
}

function validateFields(obj, requiredFields, context) {
    for (const field of requiredFields) {
        if (!(field in obj)) {
            throw new Error(`Missing required field '${field}' in ${context}`);
        }
    }
}

async function validateStructure(structure, currentPath = '') {
    const totals = { files: 0, directories: 0 };

    for (const [key, value] of Object.entries(structure)) {
        const fullPath = path.join(currentPath, key);

        if (value.files) {
            totals.directories++;
            
            // Validate each file
            for (const [filename, metadata] of Object.entries(value.files)) {
                totals.files++;
                validateFields(metadata, REQUIRED_FIELDS.file, `file ${filename}`);
                
                if (!VALID_CATEGORIES.includes(metadata.category)) {
                    throw new Error(`Invalid category '${metadata.category}' in file ${filename}`);
                }

                // Validate file exists and checksum matches
                const filePath = path.join(process.cwd(), fullPath, filename);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    const checksum = calculateChecksum(content);
                    if (checksum !== metadata.checksum) {
                        throw new Error(`Checksum mismatch for ${filename}`);
                    }
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        throw new Error(`File ${filename} referenced in index but not found on disk`);
                    }
                    throw error;
                }
            }
        }

        if (value.directories) {
            if (!Array.isArray(value.directories)) {
                throw new Error(`'directories' must be an array in ${fullPath}`);
            }
            
            // Validate each subdirectory exists
            for (const dir of value.directories) {
                const dirPath = path.join(process.cwd(), fullPath, dir);
                try {
                    const stats = await fs.stat(dirPath);
                    if (!stats.isDirectory()) {
                        throw new Error(`${dir} exists but is not a directory`);
                    }
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        throw new Error(`Directory ${dir} referenced in index but not found on disk`);
                    }
                    throw error;
                }
            }
        }

        // Recursively validate subdirectories
        for (const dir of value.directories || []) {
            if (value[dir]) {
                const subTotals = await validateStructure(value[dir], path.join(fullPath, dir));
                totals.files += subTotals.files;
                totals.directories += subTotals.directories;
            }
        }
    }

    return totals;
}

async function calculateTotals(structure) {
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

function calculateChecksum(content) {
    return `sha256-${crypto.createHash('sha256').update(content).digest('hex')}`;
}

// Run validation if called directly
if (require.main === module) {
    validateIndex();
} 