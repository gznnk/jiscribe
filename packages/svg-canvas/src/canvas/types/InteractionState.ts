/**
 * Enum for the interaction state of the SvgCanvas.
 * Represents whether the canvas is in normal state, dragging, or transforming.
 */
export enum InteractionState {
	/** Idle state - no special interaction */
	Idle = "idle",
	/** Dragging state - user is dragging elements */
	Dragging = "dragging",
	/** Transforming state - user is transforming elements (resize, rotate, etc.) */
	Transforming = "transforming",
	/** Changing state - user is modifying diagram properties */
	Changing = "changing",
	/** Area selection state - user is selecting multiple elements by drawing a rectangle */
	AreaSelection = "areaSelection",
	/** Grab scroll state - user is scrolling the canvas with grab (including inertia) */
	GrabScroll = "grabScroll",
}
