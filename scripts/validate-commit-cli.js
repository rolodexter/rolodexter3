#!/usr/bin/env node
const validateCommitMessage = require('./validate-commit');
const fs = require('fs');
const path = require('path');

// Support both direct message input and file path for GitHub Desktop compatibility
let commitMsg;
const input = process.argv[2];

if (!input) {
    console.error('❌ No commit message provided');
    process.exit(1);
}

// Handle Windows-style paths and file reading
try {
    const normalizedPath = path.normalize(input);
    
    // Check if input is a file path and exists
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
        commitMsg = fs.readFileSync(normalizedPath, 'utf8').trim();
        // Handle Windows CRLF line endings
        commitMsg = commitMsg.replace(/\r\n/g, '\n').split('\n')[0];
    } else {
        // If not a file or doesn't exist, treat as direct message
        commitMsg = input;
    }
} catch (err) {
    if (err.code === 'EISDIR') {
        // If it's a directory, treat the input as the commit message
        commitMsg = input;
    } else {
        console.error('❌ Error reading commit message:', err.message);
        process.exit(1);
    }
}

// Run validation
const result = validateCommitMessage(commitMsg);

if (!result.isValid) {
    console.error('\n❌ Invalid commit message:');
    result.violations.forEach(violation => {
        console.error(`   - ${violation}`);
    });
    console.error('\nValid examples:');
    console.error('✅ Add user authentication feature');
    console.error('✅ Knowledge graph visualization update');
    console.error('✅ Manual: Implementation review');
    console.error('✅ Fix broken navigation links\n');
    process.exit(1);
}

console.log('✅ Valid commit message');
process.exit(0);