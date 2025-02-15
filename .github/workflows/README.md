# GitHub Actions Workflows

## Update Session History Workflow
This workflow automatically updates `memory/session-history.md` after each commit to maintain a persistent record of changes.

### Features
- 🔄 Runs on every push to main branch
- 📝 Generates AI-powered commit summaries
- 📊 Tracks file changes with detailed stats
- 🤖 Uses GitHub Actions bot for commits
- 🔍 Includes commit hashes and timestamps

### Configuration
The workflow is configured in `update-memory.yml` and requires:
- `contents: write` permission
- GitHub Actions bot credentials
- Access to the repository history