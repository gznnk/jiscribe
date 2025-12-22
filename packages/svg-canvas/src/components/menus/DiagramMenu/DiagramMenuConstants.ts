// Menu item IDs for type-safe menu state management
export enum MenuItemId {
	ARROW_HEAD_START = "arrowHeadStart",
	ARROW_HEAD_END = "arrowHeadEnd",
	BG_COLOR = "bgColor",
	BORDER_COLOR = "borderColor",
	BORDER_STYLE = "borderStyle",
	LINE_COLOR = "lineColor",
	LINE_STYLE = "lineStyle",
	FONT_SIZE = "fontSize",
	FONT_COLOR = "fontColor",
	ALIGNMENT = "alignment",
	STACK_ORDER = "stackOrder",
}

// Font size constraints
export const MIN_FONT_SIZE = 1;
export const MAX_FONT_SIZE = 999;
export const DEFAULT_FONT_SIZE = 14;

// Border radius constraints
export const MIN_BORDER_RADIUS = 0;
export const MAX_BORDER_RADIUS = 999;
export const DEFAULT_BORDER_RADIUS = 0;

// Stroke width constraints
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 100;
export const DEFAULT_STROKE_WIDTH = 2;

// Border width constraints
export const MIN_BORDER_WIDTH = 0;
export const MAX_BORDER_WIDTH = 100;
export const DEFAULT_BORDER_WIDTH = 2;
