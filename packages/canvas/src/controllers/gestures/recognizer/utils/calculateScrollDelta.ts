import { AUTO_SCROLL_STEP_SIZE } from "../GestureRecognizerConstants";
import type { ScrollDelta } from "../GestureRecognizerTypes";

/**
 * Computes the scroll delta based on edge proximity.
 * This pure function decides how much to scroll in each direction based on which
 * edge the cursor is near.
 *
 * @param horizontal - Horizontal edge proximity ("left" | "right" | null)
 * @param vertical - Vertical edge proximity ("top" | "bottom" | null)
 * @returns A scroll value object containing deltaX and deltaY
 */
export const calculateScrollDelta = (
	horizontal: "left" | "right" | null,
	vertical: "top" | "bottom" | null,
): ScrollDelta => {
	let deltaX = 0;
	let deltaY = 0;

	if (horizontal === "left") {
		deltaX = -AUTO_SCROLL_STEP_SIZE;
	} else if (horizontal === "right") {
		deltaX = AUTO_SCROLL_STEP_SIZE;
	}

	if (vertical === "top") {
		deltaY = -AUTO_SCROLL_STEP_SIZE;
	} else if (vertical === "bottom") {
		deltaY = AUTO_SCROLL_STEP_SIZE;
	}

	return { deltaX, deltaY };
};
