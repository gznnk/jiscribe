import type { Point } from "@jiscribe/geometry";

import {
	FLING_MAX_SPEED,
	FLING_RELEASE_IDLE_MS,
	FLING_VELOCITY_MIN_SPAN_MS,
} from "../GestureRecognizerConstants";

/** One recorded pointer position, the raw material the release velocity is estimated from. */
export type FlingSample = {
	/** Client / screen X in px, straight from the pointer event. */
	clientX: number;
	/** Client / screen Y in px, measured from the viewport top. */
	clientY: number;
	/** Event time in ms on the performance.now() time base, shared with the release time. */
	time: number;
};

const ZERO_VELOCITY: Point = { x: 0, y: 0 };

/**
 * Velocity a released drag glides on, in screen px per millisecond, measured
 * across the recorded samples. Screen-based like the pan itself: world
 * coordinates shift while the view moves, client coordinates do not.
 *
 * Returns a zero vector whenever there is nothing to glide from: fewer than two
 * samples, a span too short to divide by, or a pointer that had come to rest
 * before it lifted.
 *
 * @param samples - Recent pointer positions of the released press in ascending
 *   time order, already limited to the estimation window by the caller
 *   (GestureRecognizer trims to FLING_VELOCITY_WINDOW_MS); the oldest and newest
 *   entries are what the estimate is taken across.
 * @param releaseTime - Time of the pointerup, on the same time base as the
 *   samples. Only its distance from the newest sample is read
 *   (FLING_RELEASE_IDLE_MS).
 * @returns The velocity vector, clamped to FLING_MAX_SPEED in magnitude.
 */
export const calcFlingVelocity = (
	samples: readonly FlingSample[],
	releaseTime: number,
): Point => {
	const oldest = samples[0];
	const newest = samples[samples.length - 1];
	if (oldest === undefined || newest === undefined || oldest === newest) {
		return ZERO_VELOCITY;
	}

	if (releaseTime - newest.time > FLING_RELEASE_IDLE_MS) {
		return ZERO_VELOCITY;
	}

	const span = newest.time - oldest.time;
	if (span < FLING_VELOCITY_MIN_SPAN_MS) {
		return ZERO_VELOCITY;
	}

	const x = (newest.clientX - oldest.clientX) / span;
	const y = (newest.clientY - oldest.clientY) / span;
	const speed = Math.hypot(x, y);
	if (speed > FLING_MAX_SPEED) {
		const scale = FLING_MAX_SPEED / speed;
		return { x: x * scale, y: y * scale };
	}
	return { x, y };
};
