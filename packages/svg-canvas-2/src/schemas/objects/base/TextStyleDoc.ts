import type { TextAlign } from "../types/TextAlign";
import type { TextType } from "../types/TextType";
import type { VerticalAlign } from "../types/VerticalAlign";

/**
 * Properties related to text styling and content.
 * Used for shapes that can display text (rect, ellipse, etc.)
 */
export type TextStyleDoc = {
	/** Text content to display */
	text?: string;
	/** Text display type */
	textType?: TextType;
	/** Horizontal text alignment */
	textAlign?: TextAlign;
	/** Vertical text alignment */
	verticalAlign?: VerticalAlign;
	/** Text color (CSS color string) */
	fontColor?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	fontFamily?: string;
	/** Font weight */
	fontWeight?: string;
};
