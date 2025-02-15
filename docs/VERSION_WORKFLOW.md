# ROLODEXTER Version Management Workflow

## Overview
This document outlines the procedures for managing versions, creating backups, and maintaining the changelog for the ROLODEXTER project.

## Daily Workflow

### 1. Making Changes
```bash
# Start work on a new feature
git checkout -b feature/your-feature-name

# Make your changes...

# Commit changes using conventional commits
git commit -m "feat(scope): description"
```

### 2. Updating Changelog
1. Open `docs/CHANGELOG.md`
2. Add your changes under the `[Unreleased]` section
3. Follow the format:
   - Added: for new features
   - Changed: for changes in existing functionality
   - Deprecated: for soon-to-be removed features
   - Removed: for now removed features
   - Fixed: for any bug fixes
   - Security: in case of vulnerabilities

### 3. Creating Backups
```bash
# Create a manual backup
./scripts/version.sh backup manual

# Automatic daily backups are created at midnight
```

## Release Process

### 1. Preparing a Release
```bash
# Create a release
./scripts/version.sh release X.Y.Z "Release description"
```

### 2. Post-Release Checklist
- [ ] Verify all changes are documented in CHANGELOG.md
- [ ] Check backup is created in backups/releases/
- [ ] Update version references in documentation
- [ ] Deploy to production
- [ ] Tag release on GitHub

## Backup Management

### Types of Backups
1. **Daily Backups**
   - Created automatically
   - Stored in `backups/daily/`
   - Kept for 7 days

2. **Manual Backups**
   - Created before major changes
   - Stored in `backups/manual/`
   - Kept indefinitely

3. **Release Backups**
   - Created with each release
   - Stored in `backups/releases/`
   - Never deleted

### Restoring from Backup
```bash
# Restore from a backup file
./scripts/version.sh restore backups/releases/rolodexter_release_20240120_120000.tar.gz
```

## Version Numbering

### Format: MAJOR.MINOR.PATCH
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Examples:
- 1.0.0: Initial release
- 1.1.0: Added new feature
- 1.1.1: Bug fix
- 2.0.0: Breaking change

## Git Workflow

### Branch Structure
```
main
├── develop
│   ├── feature/new-feature
│   ├── fix/bug-fix
│   └── docs/update-docs
└── hotfix/critical-fix
```

### Branch Types
- `main`: Production code
- `develop`: Development branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates
- `hotfix/*`: Critical fixes

## Emergency Procedures

### Production Issues
1. Create hotfix branch
2. Fix issue
3. Create backup
4. Update CHANGELOG.md
5. Increment PATCH version
6. Merge to main and develop

### Data Recovery
1. Identify latest working backup
2. Test restore in staging
3. Execute restore in production
4. Verify functionality
5. Document incident

## Best Practices

1. **Commits**
   - Use conventional commit messages
   - Reference issues where applicable
   - Keep commits focused and atomic

2. **Documentation**
   - Update docs with code changes
   - Keep CHANGELOG.md current
   - Document breaking changes

3. **Testing**
   - Test before creating release
   - Verify backup integrity
   - Check restored backups

4. **Version Control**
   - Never force push to main
   - Keep local repo updated
   - Review changes before commit