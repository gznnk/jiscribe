/**
 * Constants used throughout the SVG Canvas feature
 */

/** Drag dead zone in pixels */
export const DRAG_DEAD_ZONE = 5;

/** Margin between shapes and connection lines */
export const CONNECT_LINE_MARGIN = 20;

/** MiniMap viewport constraint margin in canvas units */
export const MINIMAP_VIEWPORT_MARGIN = 20000;

/** The threshold from the edge of the canvas to trigger auto-expansion */
export const AUTO_SCROLL_THRESHOLD = 20;

/** The amount of space to scroll each time when auto-scrolling at canvas edge */
export const AUTO_SCROLL_STEP_SIZE = 10;

/** Interval duration for continuous auto-scrolling when cursor is at edge (in milliseconds) */
export const AUTO_SCROLL_INTERVAL_MS = 20;

/** Deceleration factor for inertia scrolling (lower = faster stop, higher = longer coast) */
export const INERTIA_DECELERATION = 0.93;

/** Minimum velocity threshold for inertia scrolling (pixels per millisecond) */
export const INERTIA_MIN_VELOCITY = 0.01;

/** Velocity threshold for starting inertia animation (pixels per millisecond) */
export const INERTIA_VELOCITY_THRESHOLD = 0.1;

/** Maximum velocity for inertia scrolling (pixels per millisecond) */
export const INERTIA_MAX_VELOCITY = 4.0;
