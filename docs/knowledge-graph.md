# Knowledge Graph Implementation

The Knowledge Graph visualizes relationships between content across the site. It works entirely client-side and is compatible with GitHub Pages hosting.

## Features

- Visualizes relationships between `.md` and `.html` files
- Parses metadata from HTML meta tags and Markdown front matter
- Interactive zoom, pan, and click-to-navigate functionality
- Automatic node clustering by category
- Edge creation based on explicit connections and shared tags

## Metadata Format

Add the following meta tags to HTML files:

```html
<meta name="graph-tags" content="tag1, tag2, tag3">
<meta name="graph-category" content="core|documentation|research|feature|legal|community|labs">
<meta name="graph-connections" content="path/to/file1.html, path/to/file2.md">
<meta name="graph-created" content="YYYY-MM-DDTHH:mm:ssZ">
<meta name="graph-modified" content="YYYY-MM-DDTHH:mm:ssZ">
```

For Markdown files, use YAML front matter:

```yaml
---
graph-tags: tag1, tag2, tag3
graph-category: core
graph-connections: path/to/file1.html, path/to/file2.md
graph-created: 2025-01-15T14:30:00Z
graph-modified: 2025-02-16T20:46:15Z
---
```

## Development

To validate metadata across all files:

```bash
npm run validate-metadata
```

## Implementation Details

The graph is implemented using D3.js and consists of:

- `graph-metadata.js`: Handles metadata parsing and graph data structure
- `knowledge-graph.js`: D3.js visualization and interaction
- CSS styles in `style.css` for graph appearance

No server-side components are required - all functionality runs in the browser.