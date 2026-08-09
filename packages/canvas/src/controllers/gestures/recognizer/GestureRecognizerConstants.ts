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
 * Hold duration for a touch long press (milliseconds). The press must stay
 * within the touch drag slop (DRAG_THRESHOLD_TOUCH) for the whole duration.
 */
export const LONG_PRESS_DURATION_MS = 500;

/**
 * Minimum finger distance for computing a pinch zoom factor (screen pixels).
 * Below this the distance ratio degenerates (division by ~0), so the scale is
 * held at 1 and only the pan component is applied.
 */
export const PINCH_MIN_DISTANCE = 1;

/**
 * Age of the oldest pointer sample the release velocity is estimated over
 * (milliseconds). Long enough to average out per-frame jitter, short enough that
 * only the final motion of the drag decides the glide.
 */
export const FLING_VELOCITY_WINDOW_MS = 100;

/**
 * Shortest sample span the release velocity may be divided by (milliseconds).
 * A burst of pointer events delivered within a millisecond or two would
 * otherwise produce an absurd speed from a normal-sized movement.
 */
export const FLING_VELOCITY_MIN_SPAN_MS = 8;

/**
 * How stale the newest sample may be at the release for a glide to start
 * (milliseconds). Coming to rest before letting go means "stop here", however
 * fast the drag was a moment earlier.
 */
export const FLING_RELEASE_IDLE_MS = 50;

/**
 * Release speed below which no glide starts (screen px per millisecond).
 * Keeps an ordinary slow pan from drifting past where it was released.
 */
export const FLING_MIN_SPEED = 0.15;

/**
 * Upper bound on the estimated release speed (screen px per millisecond).
 * ~4000 px/s, roughly the fastest deliberate flick; anything above is a
 * measurement artifact rather than intent.
 */
export const FLING_MAX_SPEED = 4;

/** Speed at which the glide is considered finished (screen px per millisecond). */
export const FLING_STOP_SPEED = 0.02;

/**
 * Fraction of the speed a glide keeps per FLING_REFERENCE_FRAME_MS. Applied as
 * an exponent of the elapsed time so the deceleration curve is the same on any
 * refresh rate.
 */
export const FLING_DECAY_PER_FRAME = 0.95;

/** Frame duration FLING_DECAY_PER_FRAME is quoted against (milliseconds, 60fps). */
export const FLING_REFERENCE_FRAME_MS = 1000 / 60;

/**
 * Longest frame delta a glide integrates over (milliseconds). A backgrounded tab
 * delivers no frames, and without the clamp the first frame after it returns
 * would jump the view by the whole absence.
 */
export const FLING_MAX_FRAME_MS = 64;

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

/**
 * Distance threshold between two touch taps for treating them as a double tap
 * (screen pixels squared).
 * Wider than the mouse value for the same reason as DRAG_THRESHOLD_TOUCH: each
 * tap lands anywhere within the touch slop, so two taps easily sit 5px+ apart
 * and the mouse threshold would make double-tap (e.g. entering text edit)
 * unreliable on devices.
 */
export const DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH = 20 * 20;
