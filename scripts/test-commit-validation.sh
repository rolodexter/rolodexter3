#!/bin/bash

# Test commit messages
test_messages=(
    "Add user authentication feature"
    "Fixed broken links"
    "Updated the readme file."
    "refactored code"
)

expected_results=(
    "PASS"  # Correct format
    "FAIL"  # Wrong tense
    "FAIL"  # Ends with period
    "FAIL"  # Lowercase start
)

echo "Running commit message validation tests..."
echo "----------------------------------------"

for msg in "${test_messages[@]}"; do
    echo "Testing: '$msg'"
    node ./scripts/validate-commit-cli.js "$msg"
    echo "----------------------------------------"
done