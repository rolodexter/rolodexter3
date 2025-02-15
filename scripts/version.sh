#!/bin/bash

# ROLODEXTER Version Control and Backup Script

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VERSION_FILE="docs/VERSION"
CHANGELOG_FILE="docs/CHANGELOG.md"

# Create backup directories
create_backup_dirs() {
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/manual"
    mkdir -p "$BACKUP_DIR/releases"
}

# Create backup
create_backup() {
    local TYPE=$1
    local DIR="$BACKUP_DIR/$TYPE"
    local ARCHIVE="rolodexter_${TYPE}_${TIMESTAMP}.tar.gz"
    
    echo "Creating $TYPE backup..."
    tar -czf "$DIR/$ARCHIVE" \
        --exclude=".git" \
        --exclude="node_modules" \
        --exclude="backups" \
        .
    
    echo "Backup created: $DIR/$ARCHIVE"
}

# Create release version
create_release() {
    local VERSION=$1
    local MESSAGE=$2
    
    # Update version file
    echo "$VERSION" > "$VERSION_FILE"
    
    # Create backup
    create_backup "releases"
    
    # Git operations
    git add .
    git commit -m "Release version $VERSION: $MESSAGE"
    git tag -a "v$VERSION" -m "$MESSAGE"
    
    echo "Release v$VERSION created successfully"
}

# Restore from backup
restore_backup() {
    local BACKUP_FILE=$1
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    echo "Restoring from backup: $BACKUP_FILE"
    tar -xzf "$BACKUP_FILE"
    
    echo "Restoration complete"
}

# Daily backup automation
daily_backup() {
    create_backup "daily"
    
    # Clean up old backups (keep last 7 days)
    find "$BACKUP_DIR/daily" -type f -mtime +7 -delete
}

# Display help
show_help() {
    echo "ROLODEXTER Version Control and Backup Script"
    echo "Usage:"
    echo "  ./version.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backup [daily|manual]    Create a backup"
    echo "  release [version] [msg]  Create a new release"
    echo "  restore [file]          Restore from backup"
    echo "  help                    Show this help message"
}

# Main script logic
case "$1" in
    "backup")
        create_backup_dirs
        create_backup "${2:-manual}"
        ;;
    "release")
        if [ -z "$2" ]; then
            echo "Error: Version number required"
            exit 1
        fi
        create_release "$2" "${3:-New release}"
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "Error: Backup file required"
            exit 1
        fi
        restore_backup "$2"
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use './version.sh help' for usage information"
        exit 1
        ;;
esac