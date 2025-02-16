#!/usr/bin/env node
const LinkValidator = require('./validate-links');
const path = require('path');

const args = process.argv.slice(2);
const options = {
    baseDir: process.cwd(),
    excludeDirs: ['node_modules', '.git'],
    fileTypes: ['.html', '.md'],
    checkExternal: true
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--dir':
            options.baseDir = path.resolve(args[++i]);
            break;
        case '--exclude':
            options.excludeDirs = args[++i].split(',');
            break;
        case '--types':
            options.fileTypes = args[++i].split(',');
            break;
        case '--no-external':
            options.checkExternal = false;
            break;
        case '--help':
            console.log(`
Link Validator CLI

Usage: validate-links-cli [options]

Options:
  --dir <path>          Base directory to start validation from (default: current directory)
  --exclude <dirs>      Comma-separated list of directories to exclude (default: node_modules,.git)
  --types <extensions>  Comma-separated list of file extensions to check (default: .html,.md)
  --no-external        Skip external link validation
  --help               Show this help message

Examples:
  validate-links-cli --dir ./docs
  validate-links-cli --exclude node_modules,dist,build
  validate-links-cli --types .html,.md,.txt
  validate-links-cli --no-external
`);
            process.exit(0);
    }
}

console.log('Starting link validation...');
console.log('Options:', JSON.stringify(options, null, 2));

const validator = new LinkValidator(options);
validator.validateLinks()
    .then(report => {
        console.log('\nLink Validation Report:');
        console.log('=====================');
        
        // Internal links summary
        console.log('\nInternal Links:');
        console.log(`✓ Valid: ${report.summary.internal.valid}`);
        console.log(`✗ Invalid: ${report.summary.internal.invalid}`);
        
        // External links summary
        if (options.checkExternal) {
            console.log('\nExternal Links:');
            console.log(`✓ Valid: ${report.summary.external.valid}`);
            console.log(`✗ Invalid: ${report.summary.external.invalid}`);
        }
        
        // Invalid links details
        if (report.invalid.internal.length > 0) {
            console.log('\nInvalid Internal Links:');
            report.invalid.internal.forEach(({ link, sourceFile }) => {
                console.log(`✗ ${link} (in ${sourceFile})`);
            });
        }
        
        if (options.checkExternal && report.invalid.external.length > 0) {
            console.log('\nInvalid External Links:');
            report.invalid.external.forEach(({ link, sourceFile, status, error }) => {
                const reason = status ? `Status: ${status}` : `Error: ${error}`;
                console.log(`✗ ${link} (in ${sourceFile}) - ${reason}`);
            });
        }
        
        const totalInvalid = report.summary.internal.invalid + 
                           (options.checkExternal ? report.summary.external.invalid : 0);
        
        if (totalInvalid > 0) {
            console.error(`\n❌ Found ${totalInvalid} invalid link(s). Please fix them and run validation again.`);
            process.exit(1);
        }
        
        console.log('\n✅ All links are valid!');
    })
    .catch(error => {
        console.error('Error running link validation:', error);
        process.exit(1);
    }); 