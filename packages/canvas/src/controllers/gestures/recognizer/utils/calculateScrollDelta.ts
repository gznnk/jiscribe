import {
	AUTO_SCROLL_REFERENCE_FRAME_MS,
	AUTO_SCROLL_STEP_SIZE,
} from "../GestureRecognizerConstants";
import type { ScrollDelta } from "../GestureRecognizerTypes";

/**
 * Computes the scroll delta based on edge proximity.
 * This pure function decides how much to scroll in each direction based on which
 * edge the cursor is near.
 *
 * @param horizontal - Horizontal edge proximity ("left" | "right" | null)
 * @param vertical - Vertical edge proximity ("top" | "bottom" | null)
 * @param elapsedMs - Time this tick covers (milliseconds). The step scales
 *   linearly with it, so the scroll speed stays AUTO_SCROLL_STEP_SIZE per
 *   reference frame however unevenly the ticks arrive.
 * @returns A scroll value object containing deltaX and deltaY
 */
export const calculateScrollDelta = (
	horizontal: "left" | "right" | null,
	vertical: "top" | "bottom" | null,
	elapsedMs: number,
): ScrollDelta => {
	const step =
		AUTO_SCROLL_STEP_SIZE * (elapsedMs / AUTO_SCROLL_REFERENCE_FRAME_MS);

	let deltaX = 0;
	let deltaY = 0;

	if (horizontal === "left") {
		deltaX = -step;
	} else if (horizontal === "right") {
		deltaX = step;
	}

	if (vertical === "top") {
		deltaY = -step;
	} else if (vertical === "bottom") {
		deltaY = step;
	}

	return { deltaX, deltaY };
};
