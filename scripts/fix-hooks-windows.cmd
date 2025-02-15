@echo off
echo Fixing GitHub Desktop commit hooks for Windows...

:: Ensure .husky directory exists
if not exist ".husky" mkdir .husky

:: Set correct git hooks path
git config core.hooksPath .husky

:: Set executable bits (Windows equivalent)
icacls ".husky\pre-commit" /grant Everyone:RX
icacls ".husky\commit-msg" /grant Everyone:RX

:: Verify husky installation
call npm run prepare

echo Configuration complete. Testing commit validation...
:: Test validation script
node scripts/validate-commit-cli.js "Add test commit validation"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Hook configuration successful
) else (
    echo ❌ Hook configuration needs review
)