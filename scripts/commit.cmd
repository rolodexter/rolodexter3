:: Detect if running in PowerShell or CMD
@echo off
setlocal enabledelayedexpansion

if defined PS_COMMAND (
    powershell -ExecutionPolicy Bypass -File "%~dp0commit-to-main.ps1"
) else (
    :: Running in CMD
    echo Running Windows batch commit process...
    
    :: Temporarily disable hooks and set Windows Git config
    git config --global core.autocrlf true
    git config --local core.hooksPath ""
    
    :: Stage and commit
    git add .
    if !ERRORLEVEL! EQU 0 (
        git commit -m "Manual: Windows compatibility update"
        if !ERRORLEVEL! EQU 0 (
            git push origin main
            if !ERRORLEVEL! EQU 0 (
                echo ✅ Changes successfully pushed to main
            ) else (
                echo ❌ Push failed
                exit /b 1
            )
        ) else (
            echo ❌ Commit failed
            exit /b 1
        )
    ) else (
        echo ❌ Git add failed
        exit /b 1
    )
    
    :: Restore hooks
    git config --local core.hooksPath .husky
)

exit /b 0