/**
 * Threshold for detecting a drag with a mouse or pen (screen pixels, squared).
 * Compared against clientDelta so the feel does not change with zoom
 * (cf. DOUBLE_CLICK_DISTANCE_THRESHOLD).
 */
export const DRAG_THRESHOLD = 3 * 3;

/**
 * Threshold for detecting a drag with a touch pointer (screen pixels, squared).
 * Wider than the mouse/pen value: finger jitter easily exceeds 3px, which would
 * turn taps into accidental micro-drags (and will destabilize a long-press hold).
 */
export const DRAG_THRESHOLD_TOUCH = 10 * 10;

/** Distance from the viewport edge that triggers edge scrolling (pixels) */
export const AUTO_SCROLL_THRESHOLD = 20;

/** Scroll amount during edge scrolling (pixels) */
export const AUTO_SCROLL_STEP_SIZE = 10;

/**
 * Minimum finger distance for computing a pinch zoom factor (screen pixels).
 * Below this the distance ratio degenerates (division by ~0), so the scale is
 * held at 1 and only the pan component is applied.
 */
export const PINCH_MIN_DISTANCE = 1;

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
