@echo off
:: Get the commit message from the file
set /p COMMIT_MSG=< %1
:: Run validation
node ./scripts/validate-commit-cli.js "%COMMIT_MSG%"
if %ERRORLEVEL% neq 0 exit /b 1
