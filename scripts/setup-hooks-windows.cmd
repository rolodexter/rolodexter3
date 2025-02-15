::@echo off
echo Configuring Git hooks for Windows...

:: Create .husky directory if it doesn't exist
if not exist ".husky" mkdir .husky

:: Create commit-msg hook with Windows-compatible script
(
echo @echo off
echo :: Get the commit message from the file
echo set /p COMMIT_MSG=^< %%1
echo :: Run validation
echo node ./scripts/validate-commit-cli.js "%%COMMIT_MSG%%"
echo if %%ERRORLEVEL%% neq 0 exit /b 1
) > .husky\commit-msg.cmd

:: Set execute permissions
icacls ".husky\commit-msg.cmd" /grant Everyone:RX >nul 2>&1

:: Configure git to use local hooks
git config core.hooksPath .husky

echo Hook configuration complete!