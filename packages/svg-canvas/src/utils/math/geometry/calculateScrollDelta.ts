import { AUTO_SCROLL_STEP_SIZE } from "../../../constants/core/Constants";

/**
 * Represents scroll delta values for x and y axes.
 */
export type ScrollDelta = {
	/** X-axis scroll delta */
	deltaX: number;
	/** Y-axis scroll delta */
	deltaY: number;
};

/**
 * Calculates scroll delta values based on edge proximity directions.
 * This is a pure function that determines how much to scroll in each direction
 * based on which edges the cursor is near.
 *
 * @param horizontal - Horizontal edge proximity ("left" | "right" | null)
 * @param vertical - Vertical edge proximity ("top" | "bottom" | null)
 * @returns Object containing deltaX and deltaY scroll values
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
