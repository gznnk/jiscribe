import {
	FLOATING_BAR_BORDER_WIDTH,
	FLOATING_BAR_PADDING,
} from "./floatingBarStyles";

/**
 * Height in px of the top toolbar's buttons (the icon and toggle buttons, also
 * their width, and the zoom readout), which is what sets a pill's height.
 */
export const TOOLBAR_BUTTON_SIZE = 32;

/**
 * Inset in px of the floating bars from the viewport's edges: each top-bar
 * pill from the top and its side, the stencil bar's band from the left,
 * bottom and right, so the bar lines up under the start pill.
 */
export const FLOATING_BAR_INSET = 12;

/**
 * Distance in px from the viewport's top to the bottom edge of a top-bar pill,
 * whose content is one toolbar button tall (`TOOLBAR_BUTTON_SIZE`). A host
 * slot taller than that grows the pill past it, which this does not follow.
 */
export const TOOLBAR_PILL_BOTTOM =
	FLOATING_BAR_INSET +
	TOOLBAR_BUTTON_SIZE +
	2 * (FLOATING_BAR_PADDING + FLOATING_BAR_BORDER_WIDTH);
