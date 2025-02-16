const fs = require('fs');
const path = require('path');
const glob = require('glob');

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
    defaultValues: {
        'graph-category': 'documentation',
        'graph-tags': 'tasks, updates, status',
        'graph-connections': '/memory/rolodexterVS/index.html',
        'graph-authors': 'rolodexterVS',
        'graph-status': 'active'
    }
};

// Utility function to get current timestamp in ISO format
function getCurrentTimestamp() {
    return new Date().toISOString();
}

// Function to validate metadata in a file
function validateMetadata(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const missing = [];

    config.metadataRequired.forEach(tag => {
        if (!content.includes(`<meta name="${tag}"`)) {
            missing.push(tag);
        }
    });

    return {
        file: filePath,
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
function processFiles(pattern = '**/*.html') {
    const files = glob.sync(pattern, { 
        cwd: config.basePath,
        ignore: ['node_modules/**', 'dist/**']
    });

    const results = {
        processed: 0,
        updated: 0,
        errors: []
    };

    files.forEach(file => {
        const filePath = path.join(config.basePath, file);
        try {
            // Validate metadata
            const validation = validateMetadata(filePath);
            
            if (!validation.isValid) {
                // Add missing metadata
                if (addMissingMetadata(filePath, validation.missing)) {
                    results.updated++;
                }
            }

            // Update timestamps
            if (updateTimestamps(filePath)) {
                results.updated++;
            }

            results.processed++;
        } catch (error) {
            results.errors.push({
                file,
                error: error.message
            });
        }
    });

    return results;
}

// CLI execution
if (require.main === module) {
    const pattern = process.argv[2] || '**/*.html';
    const results = processFiles(pattern);
    
    console.log('\nMetadata Update Results:');
    console.log(`Processed: ${results.processed} files`);
    console.log(`Updated: ${results.updated} files`);
    
    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(({ file, error }) => {
            console.log(`${file}: ${error}`);
        });
        process.exit(1);
    }
    
    process.exit(0);
}

module.exports = {
    processFiles,
    validateMetadata,
    updateTimestamps,
    addMissingMetadata
}; 