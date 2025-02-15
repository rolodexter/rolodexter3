@echo off
setlocal enabledelayedexpansion

echo 🔄 Syncing and pushing changes...

:: Save current state
git rev-parse HEAD > .git\current_head
git stash

:: Fetch and rebase
echo ⬇️ Fetching latest changes...
git fetch origin main
if !ERRORLEVEL! neq 0 (
    echo ❌ Failed to fetch changes
    goto :error
)

:: Attempt rebase
echo 🔄 Rebasing on latest changes...
git rebase origin/main
if !ERRORLEVEL! neq 0 (
    :: If rebase fails, abort and try merge
    git rebase --abort
    echo ⚠️ Rebase failed, attempting merge...
    git merge origin/main
    if !ERRORLEVEL! neq 0 (
        echo ❌ Merge failed
        goto :error
    )
)

:: Pop stashed changes if any
git rev-parse HEAD > .git\new_head
fc .git\current_head .git\new_head > nul
if !ERRORLEVEL! neq 0 (
    echo 📦 Restoring stashed changes...
    git stash pop
    if !ERRORLEVEL! neq 0 (
        echo ⚠️ Conflicts detected in stashed changes
        echo Please resolve conflicts and commit manually
        goto :error
    )
)

:: Stage and commit
echo 📋 Staging changes...
git add .

echo 💾 Committing changes...
git -c core.hooksPath="" commit -m "Manual: Windows compatibility updates"

:: Try normal push first
echo ⬆️ Pushing changes...
git push origin main
if !ERRORLEVEL! neq 0 (
    :: If normal push fails, try force push
    echo ⚠️ Normal push failed, attempting force push...
    git push origin main --force
    if !ERRORLEVEL! neq 0 (
        echo ❌ Force push failed
        goto :error
    )
)

echo ✅ Changes successfully synced and pushed!
goto :end

:error
echo ❌ Error occurred during sync/push process
exit /b 1

:end
del .git\current_head 2>nul
del .git\new_head 2>nul
exit /b 0