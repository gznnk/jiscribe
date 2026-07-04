import { isCssColor, isNumber, isString } from "@workspace/basic-validators";

import type { TextAlign } from "../../../schemas/objects/types/TextAlign";
import { isTextAlign } from "../../../schemas/objects/types/TextAlign";
import type { TextType } from "../../../schemas/objects/types/TextType";
import { isTextType } from "../../../schemas/objects/types/TextType";
import type { VerticalAlign } from "../../../schemas/objects/types/VerticalAlign";
import { isVerticalAlign } from "../../../schemas/objects/types/VerticalAlign";
import { isAutoColor } from "../../../schemas/objects/utils/autoColor";

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

/**
 * Type guard to check if an object has text properties (TextStyleState).
 *
 * @param obj - The object to check
 * @returns True if the object has valid text properties, false otherwise
 */
export const isTextStyleState = (obj: unknown): obj is TextStyleState => {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}

	const candidate = obj as Record<string, unknown>;

	// If the text property is present, it must be a string
	if ("text" in candidate && candidate.text !== undefined) {
		if (!isString(candidate.text)) {
			return false;
		}
	}

	// If the textType property is present, it must be a valid value
	if ("textType" in candidate && candidate.textType !== undefined) {
		if (!isTextType(candidate.textType)) {
			return false;
		}
	}

	// If the textAlign property is present, it must be a valid value
	if ("textAlign" in candidate && candidate.textAlign !== undefined) {
		if (!isTextAlign(candidate.textAlign)) {
			return false;
		}
	}

	// If the verticalAlign property is present, it must be a valid value
	if ("verticalAlign" in candidate && candidate.verticalAlign !== undefined) {
		if (!isVerticalAlign(candidate.verticalAlign)) {
			return false;
		}
	}

	// If the fontColor property is present, it must be the sentinel "auto"
	// (theme-following, issue #38) or a valid CSS color. Short-circuiting on
	// "auto" first avoids calling the browser-only isCssColor (CSS.supports).
	if ("fontColor" in candidate && candidate.fontColor !== undefined) {
		if (!isAutoColor(candidate.fontColor) && !isCssColor(candidate.fontColor)) {
			return false;
		}
	}

	// If the fontSize property is present, it must be a number
	if ("fontSize" in candidate && candidate.fontSize !== undefined) {
		if (!isNumber(candidate.fontSize)) {
			return false;
		}
	}

	// If the fontFamily property is present, it must be a string
	if ("fontFamily" in candidate && candidate.fontFamily !== undefined) {
		if (!isString(candidate.fontFamily)) {
			return false;
		}
	}

	// If the fontWeight property is present, it must be a string
	if ("fontWeight" in candidate && candidate.fontWeight !== undefined) {
		if (!isString(candidate.fontWeight)) {
			return false;
		}
	}

	return true;
};
