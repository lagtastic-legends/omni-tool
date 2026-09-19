/**
 * OMNI TOOL — Editor Workspace Canvas Theme Object
 * "The Edit Bay" High-Performance Render Constants
 *
 * Dedicated for 60/120fps HTML Canvas 2D and WebGL timeline rendering pipelines.
 * Avoids window.getComputedStyle / CSS variable read overhead during hot render loops.
 */

export const EditorCanvasTheme = {
  /**
   * Viewport colors directly behind video
   */
  viewport: {
    background: "#000000", // Pure black to prevent letterbox blending
  },

  /**
   * Workspace area outside viewport
   */
  workspace: {
    background: "#121212",
  },

  /**
   * Panels, inspectors, docks, and toolbars
   */
  panels: {
    background: "#1E1E1E",
    border: "rgba(255, 255, 255, 0.08)",
    headerBackground: "#181818",
    toolbarBackground: "#1E1E1E",
  },

  /**
   * Typography and iconography
   */
  typography: {
    primaryText: "#E2E8F0", // 87% optical white
    mutedText: "#94A3B8",   // Secondary / inactive text
    icons: "#94A3B8",       // Inactive tool icons
  },

  /**
   * Active, hover, and selection states
   */
  activeStates: {
    accent: "#3B82F6",
    accentHover: "#2563EB",
    accentSubtle: "rgba(59, 130, 246, 0.15)",
  },

  /**
   * Timeline tracks, playhead, and ruler
   */
  timeline: {
    videoTrack: "#0284C7",    // Timeline Video Track
    audioTrack: "#059669",    // Timeline Audio Track
    textTrack: "#8B5CF6",     // Timeline Text Track
    effectsTrack: "#EA580C",  // Timeline Effects Track
    playhead: "#EF4444",      // Playhead (CTI) head & needle
    playheadLine: "#EF4444",  // Vertical tracking line
    background: "#121212",    // Canvas track bed background
    gridLines: "rgba(255, 255, 255, 0.05)",
    timecodeRuler: "#181818",
  },
} as const;

export type EditorCanvasThemeType = typeof EditorCanvasTheme;

/**
 * Supported timeline track kinds
 */
export type TimelineTrackKind = "video" | "audio" | "text" | "effects";

/**
 * Fast track color resolver for 60fps canvas draw routines
 */
export function getTimelineTrackColor(kind: TimelineTrackKind): string {
  switch (kind) {
    case "video":
      return EditorCanvasTheme.timeline.videoTrack;
    case "audio":
      return EditorCanvasTheme.timeline.audioTrack;
    case "text":
      return EditorCanvasTheme.timeline.textTrack;
    case "effects":
      return EditorCanvasTheme.timeline.effectsTrack;
  }
}
