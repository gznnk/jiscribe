/** Threshold for detecting a drag (pixels squared) */
export const DRAG_THRESHOLD = 3 * 3; // 3 pixels squared

/** Distance from the viewport edge that triggers edge scrolling (pixels) */
export const AUTO_SCROLL_THRESHOLD = 20;

/** Scroll amount during edge scrolling (pixels) */
export const AUTO_SCROLL_STEP_SIZE = 10;

/** Time threshold for treating clicks as a double click (milliseconds) */
export const DOUBLE_CLICK_THRESHOLD = 300;

/**
 * Distance threshold between two clicks for treating them as a double click
 * (screen pixels squared).
 * Even within the time window, a click farther than this distance from the
 * previous click is treated as a separate click.
 * In world coordinates the meaning changes with zoom, so measure distance in
 * client (screen) coordinates.
 */
export const DOUBLE_CLICK_DISTANCE_THRESHOLD = 5 * 5; // 5 pixels squared
