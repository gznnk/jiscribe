export type SvgCanvasScrollEvent = {
	newMinX: number; // New minimum X coordinate of the canvas after scrolling
	newMinY: number; // New minimum Y coordinate of the canvas after scrolling
	clientX: number; // X coordinate of the mouse pointer when the scroll event occurred (viewport coordinates)
	clientY: number; // Y coordinate of the mouse pointer when the scroll event occurred (viewport coordinates)
	deltaX: number; // Optional horizontal scroll delta
	deltaY: number; // Optional vertical scroll delta
};
