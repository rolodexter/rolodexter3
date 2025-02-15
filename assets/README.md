# Assets Directory Structure

This directory contains all brand assets, media resources, and design elements for ROLODEXTER.

## Directory Layout

```
assets/
├── brand/           # Branding elements
│   ├── logos/      # Logo files in various formats
│   └── fonts/      # Custom fonts if any
├── icons/          # Icons and UI elements
│   ├── favicon/    # Browser favicon files
│   └── ui/         # Interface icons
├── images/         # General image assets
│   ├── textures/   # Background textures
│   └── patterns/   # UI patterns
└── media/          # Other media files
    ├── video/      # Video content
    └── audio/      # Audio content

## File Format Guidelines

### Icons
- Favicons: .ico, .png (32x32, 16x16)
- Touch Icons: .png (180x180)
- UI Icons: .svg (preferred), .png
- App Icons: .png (512x512, 192x192)

### Images
- Formats: .webp (primary), .png (fallback)
- Max Resolution: 2000x2000px
- Optimization: Compressed without quality loss

### Logos
- Vector: .svg
- Raster: .png with transparency
- Social Media: Optimized .jpg/.png

## Usage Notes

1. Always use the appropriate subdirectory for new assets
2. Follow naming convention: lowercase-with-hyphens
3. Include size suffix when relevant: icon-32x32.png
4. Maintain original files in a separate archive

## Optimization Requirements

- SVG: Optimize with SVGO
- PNG: Compress with pngquant
- WEBP: Quality 80-90
- JPEG: Quality 85 minimum