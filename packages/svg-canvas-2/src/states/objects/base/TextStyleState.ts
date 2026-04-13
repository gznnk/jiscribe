import type { TextAlign } from "../../../schemas/objects/types/TextAlign";
import type { TextType } from "../../../schemas/objects/types/TextType";
import type { VerticalAlign } from "../../../schemas/objects/types/VerticalAlign";

/**
 * Text style properties in runtime state.
 * Identical to TextStyleDoc (no transformation needed for text properties).
 */
export type TextStyleState = {
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
