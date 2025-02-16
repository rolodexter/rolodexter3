@echo off
setlocal enabledelayedexpansion

:: Get the commit message file path
set MSG_FILE=%1

:: Run validation script
node ./scripts/validate-commit-cli.js "%MSG_FILE%" || (
    echo ❌ Commit message validation failed. Please follow these guidelines:
    echo - Start with an action verb (Add, Fix, Update, Remove, Refactor, Optimize, Document^)
    echo - OR use a descriptive phrase (2+ words^)
    echo - OR prefix with 'Manual:' for executive override
    echo - Keep it under 72 characters
    echo - Don't end with a period
    echo.
    echo Examples:
    echo ✅ Add user authentication feature
    echo ✅ Improve graph visualization performance
    echo ✅ Manual: Reviewing implementation details
    echo ✅ Knowledge base structure refinement
    exit /b 1
)
