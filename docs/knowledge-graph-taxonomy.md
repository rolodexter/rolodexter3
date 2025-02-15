---
title: "Knowledge Graph Taxonomy and Front Matter Conventions"
description: "Official guidelines for tagging and categorizing content so it can be parsed into the Knowledge Graph."
date: 2025-02-16
categories: [ "documentation", "knowledge-graph" ]
tags: [ "taxonomy", "front-matter" ]
graph-category: documentation
graph-tags: taxonomy, metadata, knowledge-graph, guidelines
graph-connections: knowledge/index.html, docs/VERSION.md, memory/tasks/knowledge-graph.md
---

# Knowledge Graph Taxonomy & Front Matter

## Overview
This document defines the official taxonomy and front matter conventions for content that will be parsed into the Knowledge Graph visualization.

## Front Matter Requirements

### Required Metadata Fields
All HTML and Markdown files that should appear in the knowledge graph must include these meta fields:

```yaml
graph-category: string   # Primary category (see Categories below)
graph-tags: string      # Comma-separated list of tags
graph-connections: string # Comma-separated list of related file paths
```

### Optional Metadata Fields
```yaml
title: string          # Display name in the graph (defaults to filename)
weight: number         # Node importance (1-10, defaults to 5)
date: YYYY-MM-DD      # Creation/last updated date
status: string        # draft | published | archived
```

## Categories
Primary categories for organizing content:

- `core` - Essential system documentation
- `documentation` - General documentation and guides
- `research` - Research notes and findings
- `feature` - Feature specifications
- `legal` - Legal documents and policies
- `community` - Community guidelines and resources
- `labs` - Experimental features and tests

## Tags
Common tags for content classification:

### Development Tags
- `architecture`
- `api`
- `implementation`
- `performance`
- `security`
- `testing`

### Content Tags
- `guide`
- `tutorial`
- `reference`
- `changelog`
- `policy`
- `workflow`

### Domain Tags
- `ai`
- `blockchain`
- `solana`
- `visualization`
- `knowledge-graph`

## File Formats

### HTML Files
Meta tags should be placed in the `<head>` section:
```html
<meta name="graph-category" content="documentation">
<meta name="graph-tags" content="guide, tutorial, implementation">
<meta name="graph-connections" content="docs/getting-started.md, docs/advanced-usage.md">
```

### Markdown Files
Use YAML front matter at the start of the file:
```yaml
---
graph-category: documentation
graph-tags: guide, tutorial, implementation
graph-connections: docs/getting-started.md, docs/advanced-usage.md
---
```

## Best Practices

1. **Categories**
   - Use only one primary category per file
   - Choose the most specific applicable category
   - When in doubt, use `documentation`

2. **Tags**
   - Use 2-5 tags per file
   - Be specific but not overly narrow
   - Use existing tags when possible
   - Separate tags with commas

3. **Connections**
   - Link to directly related content
   - Use relative paths from repository root
   - Verify paths exist before committing
   - Aim for 2-6 connections per file

4. **Maintenance**
   - Review tags quarterly
   - Update connections when files move
   - Remove broken connections
   - Add new tags to this taxonomy when needed

## Implementation Notes

The Knowledge Graph parser will:
1. Scan all `.md` and `.html` files
2. Extract metadata using format-specific parsers
3. Build graph nodes from categories and tags
4. Create edges from explicit connections
5. Apply visual weights based on metadata

## Version Control
- Last Updated: 2025-02-16
- Version: 1.0.0
- Maintainer: rolodexterVS

---

*This taxonomy is maintained by rolodexter Labs, LLC and should be reviewed and updated regularly as the knowledge graph evolves.*