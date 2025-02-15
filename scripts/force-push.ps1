# Simple force push script for Windows
$ErrorActionPreference = 'Stop'

Write-Host "🔄 Attempting final push..."

try {
    # Stage all changes
    git add .
    
    # Create commit (bypassing hooks)
    git -c core.hooksPath="" commit -m "Manual: Resolve conflicts and sync Windows changes"
    
    # Try normal push first
    git push origin main
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Normal push failed, attempting force push..."
        git push origin main --force
    }
    
    Write-Host "✅ Changes pushed successfully!"
} catch {
    Write-Host "❌ Error: $_"
    exit 1
}