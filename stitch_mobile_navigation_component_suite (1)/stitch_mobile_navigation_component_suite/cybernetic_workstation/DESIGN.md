---
name: Cybernetic Workstation
colors:
  surface: '#121319'
  surface-dim: '#121319'
  surface-bright: '#383940'
  surface-container-lowest: '#0d0e14'
  surface-container-low: '#1a1b22'
  surface-container: '#1e1f26'
  surface-container-high: '#292930'
  surface-container-highest: '#34343b'
  on-surface: '#e3e1eb'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e3e1eb'
  inverse-on-surface: '#2f3037'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#121319'
  on-background: '#e3e1eb'
  surface-variant: '#34343b'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.03em
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-sm: 0.75rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system projects raw client-side computing power, precision engineering, and high-velocity local execution. Designed for creative technologists, audio/video engineers, security researchers, and power users who process intensive media and sensitive documents entirely in-browser, the interface communicates zero-latency responsiveness and total cryptographic privacy.

The aesthetic fuses **Futuristic Cyberpunk** with **High-Tech Glassmorphism** and dense, utilitarian instrumentation:
- Deep obsidian and midnight slate substrates eliminate eye strain during prolonged technical workflows.
- Electric violet and vivid cyber cyan project ionized energy, serving as primary operational conductors.
- Precision 1px luminous borders, tactical micro-grids, and monospaced telemetry parameters simulate advanced hardware diagnostic consoles and military avionics.
- Micro-surfaces balance translucent frosted glass panels with physical mechanical tactility: segmented toggles, rotary parameters, dynamic audio waveforms, and real-time WebAssembly runtime metrics.

## Colors

The palette establishes an ultra-deep, high-contrast dark space illuminated by ionized neon conduits and status readouts.

### Core Canvas & Surfaces
- **Base Canvas (`#090a10`):** The deepest obsidian void. Used for the viewport backdrop and unexposed background canvas.
- **Surface Layer 1 (`#0f111a`):** Deep midnight slate for structural panels, persistent sidebars, and inactive tool trays.
- **Surface Layer 2 (`#161826`):** Elevated console surfaces, functional tool cards, and dialog canvas layers.
- **Surface Layer 3 (`#202436`):** Hover states, active segmented cells, and recessed control wells.

### Functional Neon Accents
- **Primary Electric Violet (`#8b5cf6`):** Represents processing engine control, conversion triggers, active modes, and focal interaction elements.
- **Secondary Cyber Cyan (`#06b6d4`):** Telemetry streams, timeline playheads, scrubber nodes, frequency analyzers, and interactive data nodes.
- **Tertiary Glowing Emerald (`#10b981`):** WebAssembly status indicators, zero-loss compilation states, hardware acceleration status, and cryptographic validation badges.
- **Warning Amber (`#f59e0b`):** Memory threshold warnings, buffer limits, and irreversible destructive operations.
- **Critical Neon Crimson (`#f43f5e`):** WebGL/WASM kernel crashes, format corruption, and immediate abort directives.

### Atmospheric Glow & Alpha Tokens
- Violet Glow: `rgba(139, 92, 246, 0.25)` to `rgba(139, 92, 246, 0.05)`
- Cyan Glow: `rgba(6, 182, 212, 0.25)` to `rgba(6, 182, 212, 0.05)`
- Emerald Glow: `rgba(16, 185, 129, 0.3)`
- Ghost Boundary: `rgba(255, 255, 255, 0.08)`

## Typography

The type architecture separates natural language processing and navigational scanning from dense machine readouts.

- **Plus Jakarta Sans:** Governs high-level hierarchy, section titles, action labels, dialogs, and instructive microcopy. Its clean geometry softens the aggressive cyberpunk edge without sacrificing modernity.
- **JetBrains Mono:** Dedicated exclusively to system telemetry, frame counters, memory allocation stats, byte counts, audio decibel meters, bitrates, hash fingerprints, and code configurations. All tabular numerical figures must utilize monospace glyph rendering to prevent visual jitter during streaming operations.
- **Text Transformations:** Use uppercase styling on `label-sm` and `telemetry-sm` to create military-grade HUD telemetry labels.

## Layout & Spacing

The layout is built upon an engineering workstation paradigm: high density, space efficiency, and split-pane structural modularity.

### Layout Philosophy
- **Fluid Modular Studio:** The interface utilizes a multi-pane docked arrangement with a collapsible tool shelf, primary media stage/canvas, and collateral inspector/telemetry panels.
- **Column Grids:**
  - **Desktop (≥1280px):** 12-column or 16-column flexible fluid grid with dynamic side-docks. Standard `gutter` (16px) and `margin-lg` (40px) outer padding.
  - **Tablet (768px - 1279px):** 8-column layout with collapsable inspector drawers and persistent mini-nav.
  - **Mobile (<768px):** 4-column viewport-locked single tool view. Global tools dock into bottom sheets; inspector parameters switch to swipeable tabs.

### Spacing Scale & Rhythm
- Micro increments of `0.25rem` (4px) and `0.5rem` (8px) structure tight technical controls: scrubber ticks, badge paddings, knob margins, and parameter tables.
- Component padding strictly adheres to `space-sm` for compact utility strips and `space-md` for standard glass containers.
- Spatial compression ensures extreme information density: power users must monitor pipeline progress, input/output inspectors, and visual monitors within a single visual frame without unnecessary scrolling.

## Elevation & Depth

Elevation is rendered not through diffuse natural dropshadows, but via **luminous layering, glass refraction, and neon edge conduits**.

### Layer Hierarchy
1. **Bedrock Canvas (Level 0):** `#090a10` textured with an optional CSS micro-dot grid (16px repeat, 4% opacity).
2. **Structural Slabs (Level 1):** `#0f111a` with 1px border `rgba(255, 255, 255, 0.05)`.
3. **Floating Utility Modules (Level 2):** Glassmorphic fill `rgba(22, 24, 38, 0.7)` with `backdrop-filter: blur(16px)` and a directional 1px perimeter border: `rgba(255, 255, 255, 0.1)` on top/left, `rgba(0, 0, 0, 0.5)` on bottom/right.
4. **Active/Focused Containers (Level 3):** Glassmorphic fill `rgba(32, 36, 54, 0.85)` accompanied by a perimeter border glow: `1px solid rgba(139, 92, 246, 0.5)` and box shadow `0 0 20px -4px rgba(139, 92, 246, 0.3)`.
5. **HUD Overlays & Modals (Level 4):** Semi-opaque `#0f111a` (90% opacity), `backdrop-filter: blur(24px)`, framed in dual-tone edge lines with cyber cyan highlights (`0 0 30px -5px rgba(6, 182, 212, 0.35)`).

### Lighting & Shadow Rules
- Traditional drop shadows are replaced by localized colored cast glows.
- Shadows use saturated spreads: `0 8px 32px 0 rgba(0, 0, 0, 0.7)` combined with an inset rim light `inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`.

## Shapes

The design system maintains a **Soft-Chiseled Industrial Geometry** (Level 1 roundedness). Curvature is deliberately controlled and compact, preventing the interface from appearing playful or bubbly.

- **Base Radius (`0.25rem` / 4px):** Applied to buttons, input fields, badges, tabs, slider thumbs, and telemetry cells.
- **Medium Radius (`0.5rem` / 8px):** Applied to internal tool cards, modular utility containers, and inspector groupings.
- **Large Radius (`0.75rem` / 12px):** Applied exclusively to top-level viewport modals, detached floating tool palettes, and root layout viewports.
- **Technical Accents:** Terminal status tags, byte-range tags, and status pips use chamfered angles (using `clip-path: polygon(...)`) on selected primary control points to reinforce the cyberpunk hardware terminal tone.

## Components

### Buttons & Trigger Controls
- **Primary Interactive (Electric Violet):** Solid violet (`#8b5cf6`) with white high-contrast text, 0.25rem border-radius, subtle interior gradient glow, and a `box-shadow: 0 0 14px rgba(139, 92, 246, 0.4)`. On hover, expands luminous aura and shifts lightness +5%.
- **Secondary Tool Button:** Transparent dark slate surface (`rgba(22, 24, 38, 0.6)`) with 1px border (`rgba(255, 255, 255, 0.1)`). On hover, border activates to Cyber Cyan (`#06b6d4`) with matching cyan text transition.
- **Danger / Abort:** Matte crimson base (`rgba(244, 63, 94, 0.15)`) with neon border (`#f43f5e`).

### Chips & Telemetry Badges
- Built using `JetBrains Mono` at `label-sm` or `telemetry-sm` size.
- **WASM Acceleration Active:** Emerald tinted background (`rgba(16, 185, 129, 0.12)`), solid border (`rgba(16, 185, 129, 0.4)`), pulsing 6px neon emerald status dot.
- **Metadata Tags (Bitrate, Codec, Dimensions):** Deep charcoal substrate with ghost border (`rgba(255, 255, 255, 0.08)`), text colored in muted cyan (`#67e8f9`).

### Input Fields & Terminal Consoles
- **Numeric & Text Inputs:** Background `#0f111a`, recessed inner shadow (`inset 0 2px 4px rgba(0,0,0,0.6)`), 1px structural outline (`rgba(255, 255, 255, 0.08)`). On focus: outline illuminates into electric violet with `box-shadow: 0 0 8px rgba(139, 92, 246, 0.3)`.
- Input fields display monospaced units (`ms`, `kbps`, `px`, `fps`) locked to the right side of the control well in muted gray.

### Checkboxes, Switches & Segmented Selectors
- **Switches:** Recessed pill rail (`#090a10`) with sliding rectangular thumb (`#8b5cf6` when active, `#475569` when inactive). Active track leaves a trailing electric violet gradient.
- **Segmented Tool Mode Switchers:** Contiguous horizontal control group where the active segment slides under the cursor with an illuminated glass tile and cyan indicator pip.

### Media & Utility Specific Controls
- **Audio Waveform Trackers:** Deep slate background track with interactive cyber cyan canvas bars (`#06b6d4`). Region selections project a translucent electric violet wash with vertical 1px glowing playhead guides.
- **Rotary Knobs / Scrub Wheels:** Dark circular brushed slate dials featuring an etched indicator notch illuminated by an active cyan LED edge track.
- **Diagnostic Telemetry Log:** Terminal window running fixed-width font (`JetBrains Mono`), alternating row zebra-striping (`rgba(255,255,255,0.01)`), and real-time WASM thread execution timestamps in muted slate.