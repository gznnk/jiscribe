import {
	isCssColor,
	isNumber,
	isString,
} from "../../../../../basic-validators/src";
import type { TextAlign } from "../../../schemas/objects/types/TextAlign";
import { isTextAlign } from "../../../schemas/objects/types/TextAlign";
import type { TextType } from "../../../schemas/objects/types/TextType";
import { isTextType } from "../../../schemas/objects/types/TextType";
import type { VerticalAlign } from "../../../schemas/objects/types/VerticalAlign";
import { isVerticalAlign } from "../../../schemas/objects/types/VerticalAlign";

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

	// text プロパティが存在する場合は string でなければならない
	if ("text" in candidate && candidate.text !== undefined) {
		if (!isString(candidate.text)) {
			return false;
		}
	}

	// textType プロパティが存在する場合は有効な値でなければならない
	if ("textType" in candidate && candidate.textType !== undefined) {
		if (!isTextType(candidate.textType)) {
			return false;
		}
	}

	// textAlign プロパティが存在する場合は有効な値でなければならない
	if ("textAlign" in candidate && candidate.textAlign !== undefined) {
		if (!isTextAlign(candidate.textAlign)) {
			return false;
		}
	}

	// verticalAlign プロパティが存在する場合は有効な値でなければならない
	if ("verticalAlign" in candidate && candidate.verticalAlign !== undefined) {
		if (!isVerticalAlign(candidate.verticalAlign)) {
			return false;
		}
	}

	// fontColor プロパティが存在する場合は有効な CSS カラーでなければならない
	if ("fontColor" in candidate && candidate.fontColor !== undefined) {
		if (!isCssColor(candidate.fontColor)) {
			return false;
		}
	}

	// fontSize プロパティが存在する場合は number でなければならない
	if ("fontSize" in candidate && candidate.fontSize !== undefined) {
		if (!isNumber(candidate.fontSize)) {
			return false;
		}
	}

	// fontFamily プロパティが存在する場合は string でなければならない
	if ("fontFamily" in candidate && candidate.fontFamily !== undefined) {
		if (!isString(candidate.fontFamily)) {
			return false;
		}
	}

	// fontWeight プロパティが存在する場合は string でなければならない
	if ("fontWeight" in candidate && candidate.fontWeight !== undefined) {
		if (!isString(candidate.fontWeight)) {
			return false;
		}
	}

	return true;
};
