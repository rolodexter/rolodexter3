const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const NAMING_PATTERNS = {
  'rolodexterGPT': /rolodexter(?:GPT|Gpt|gpt)/g,
  'rolodexterVS': /rolodexter(?:VS|vs|Vs)/g,
  'rolodexter3': /rolodexter(?:3|three|Three)/g,
  'rolodexter Labs, LLC': /rolodexter(?:\s*Labs(?:\s*,\s*LLC)?|labs)/g
};

function generateReport(results) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    findings: results,
    summary: {
      total: results.length,
      byType: {}
    }
  };

  results.forEach(finding => {
    const ext = path.extname(finding.file);
    report.summary.byType[ext] = (report.summary.byType[ext] || 0) + 1;
  });

  return report;
}

async function scanFiles(dir, patterns) {
  const results = [];
  
  for (const [correct, pattern] of Object.entries(patterns)) {
    const command = `git grep -l -P "${pattern.source}" || true`;
    
    try {
      const files = await new Promise((resolve, reject) => {
        exec(command, { cwd: dir }, (error, stdout) => {
          if (error && error.code !== 1) reject(error);
          resolve(stdout.trim().split('\n').filter(Boolean));
        });
      });

      files.forEach(file => {
        results.push({
          file,
          pattern: pattern.source,
          correctForm: correct
        });
      });
    } catch (error) {
      console.error(`Error scanning for pattern ${pattern.source}:`, error);
    }
  }

  return results;
}

// Export for use in CI/CD
module.exports = {
  NAMING_PATTERNS,
  scanFiles,
  generateReport
};

// Run directly from command line
if (require.main === module) {
  const workspaceRoot = process.argv[2] || process.cwd();
  
  scanFiles(workspaceRoot, NAMING_PATTERNS)
    .then(results => {
      const report = generateReport(results);
      console.log(JSON.stringify(report, null, 2));
      
      if (results.length > 0) {
        console.log('\nFound inconsistent naming patterns. Please review the report.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}