# ROLODEXTER Color Token System

## CSS Custom Properties
All colors are defined as CSS custom properties (variables) in the root scope.

## Primary Color Tokens

### Deep Void Black (`--deep-void-black`)
- Hex: #0A0A0A
- RGB: (10, 10, 10)
- Usage: Main background, dark surfaces

### Hyperglow Cyan (`--hyperglow-cyan`)
- Hex: #00FFFF
- RGB: (0, 255, 255)
- Usage: Primary accents, highlights, interactive elements

### Liminal Purple (`--liminal-purple`)
- Hex: #8A2BE2
- RGB: (138, 43, 226)
- Usage: Secondary accents, gradients, energy effects

### Neural Gold (`--neural-gold`)
- Hex: #FFD700
- RGB: (255, 215, 0)
- Usage: Premium elements, important callouts

## Secondary Color Tokens

### Datastream Blue (`--datastream-blue`)
- Hex: #0066FF
- RGB: (0, 102, 255)
- Usage: Data visualization, progress indicators

### Glitch Magenta (`--glitch-magenta`)
- Hex: #FF00FF
- RGB: (255, 0, 255)
- Usage: Error states, glitch effects

### Infrared Red (`--infrared-red`)
- Hex: #FF3131
- RGB: (255, 49, 49)
- Usage: Warnings, critical states

### Holo White (`--holo-white`)
- Hex: #F5F5F5
- RGB: (245, 245, 245)
- Usage: Text, light UI elements

## Tertiary Color Tokens

### Dark Graphite (`--dark-graphite`)
- Hex: #1C1C1C
- RGB: (28, 28, 28)
- Usage: Secondary backgrounds, cards

### Synthwave Teal (`--synthwave-teal`)
- Hex: #2EE8BB
- RGB: (46, 232, 187)
- Usage: Success states, positive indicators

### Neon Amber (`--neon-amber`)
- Hex: #FFA500
- RGB: (255, 165, 0)
- Usage: Caution states, attention indicators

### Dimmed Carbon (`--dimmed-carbon`)
- Hex: #2E2E2E
- RGB: (46, 46, 46)
- Usage: Subtle contrasts, inactive states

## Usage Guidelines

### Text Hierarchy
- Primary text: `--holo-white`
- Secondary text: `--synthwave-teal`
- Accent text: `--hyperglow-cyan`
- Links: `--datastream-blue`

### Interactive States
- Hover: `--neural-gold`
- Active: `--liminal-purple`
- Focus: `--hyperglow-cyan`
- Disabled: `--dimmed-carbon`

### Backgrounds
- Main: `--deep-void-black`
- Cards: `--dark-graphite`
- Elevated: `--dimmed-carbon`

### Status Colors
- Success: `--synthwave-teal`
- Warning: `--neon-amber`
- Error: `--infrared-red`
- Info: `--datastream-blue`

## Accessibility
- Maintain WCAG 2.1 AA contrast ratios
- Test color combinations for colorblind users
- Provide alternative indicators beyond color