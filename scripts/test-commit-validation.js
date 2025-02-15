#!/usr/bin/env node
// Test suite for commit message validation

const validateCommitMessage = require('./validate-commit');

const testCases = [
    // Action verb cases
    { msg: 'Add user authentication', expect: true, desc: 'Standard action verb' },
    { msg: 'Fix broken links in navigation', expect: true, desc: 'Action verb with details' },
    
    // Descriptive phrase cases
    { msg: 'Knowledge graph refinements', expect: true, desc: 'Two-word description' },
    { msg: 'Implementation strategy review', expect: true, desc: 'Multi-word description' },
    
    // Manual override cases
    { msg: 'Manual: Reviewing session updates', expect: true, desc: 'Manual override' },
    { msg: 'Manual: Implementation details', expect: true, desc: 'Short manual note' },
    
    // Invalid cases
    { msg: 'test.', expect: false, desc: 'Single word with period' },
    { msg: 'a'.repeat(73), expect: false, desc: 'Too long' },
    { msg: 'just one word', expect: true, desc: 'Two words allowed' }
];

console.log('Running commit message validation tests...\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ msg, expect, desc }) => {
    const result = validateCommitMessage(msg);
    const success = result.isValid === expect;
    
    console.log(`Test: ${desc}`);
    console.log(`Message: "${msg}"`);
    console.log(`Expected: ${expect ? 'VALID' : 'INVALID'}`);
    console.log(`Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (!result.isValid) {
        console.log('Violations:', result.violations);
    }
    console.log(`Status: ${success ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    success ? passed++ : failed++;
});

console.log('Test Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${testCases.length}`);

if (failed > 0) {
    process.exit(1);
}