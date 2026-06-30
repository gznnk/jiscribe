import type { TextAlign } from "../types/TextAlign";
import type { TextType } from "../types/TextType";
import type { VerticalAlign } from "../types/VerticalAlign";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

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

/**
 * TextStyleDoc/State が占有するフィールド名（Doc/State で同一）。
 * Frame 系マッパーが text グループを allow-list で素通しする際に参照する。
 */
export const TEXT_STYLE_KEYS = exhaustiveKeysOf<TextStyleDoc>()([
	"text",
	"textType",
	"textAlign",
	"verticalAlign",
	"fontColor",
	"fontSize",
	"fontFamily",
	"fontWeight",
] as const);
