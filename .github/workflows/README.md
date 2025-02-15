# GitHub Actions Workflows

## 📝 Auto-Update Session History Workflow

This workflow automatically updates the session history and generates detailed commit summaries.

### Features

- 🕒 Runs every 5 minutes and on push events
- 📄 Generates detailed commit messages including:
  - List of changed files
  - Last commit author
  - Timestamp in UTC
- 📊 Creates detailed change summaries in session history
- 🔍 Includes git diff statistics
- 🤖 Uses GitHub Actions bot for commits

### Commit Message Format

#### For Manual Changes:
```
📝 Auto-update: file1.js, file2.css (by AuthorName)
```

#### For Scheduled Checks:
```
📝 Auto-update check (2023-12-25 12:00:00 UTC)
```

### Session History Updates
The workflow maintains a detailed log in `memory/session-history.md` including:
- Commit messages and hashes
- Author information
- File change statistics
- Detailed change summaries