import { isCssColor, isNonNegativeNumber, isObject, isString } from "@workspace/basic-validators";

import { isTextableType } from "./isTextableType";
import { isTextAlign } from "./isTextAlign";
import { isVerticalAlign } from "./isVerticalAlign";
import type { TextableData } from "../../types/data/core/TextableData";

/**
 * Check if data has valid text properties (textable feature).
 */
export const isTextableData = (data: unknown): data is TextableData => {
	if (!isObject(data)) return false;

	return (
		"text" in data &&
		isString(data.text) &&
		"textType" in data &&
		isTextableType(data.textType) &&
		"textAlign" in data &&
		isTextAlign(data.textAlign) &&
		"verticalAlign" in data &&
		isVerticalAlign(data.verticalAlign) &&
		"fontColor" in data &&
		isCssColor(data.fontColor) &&
		"fontSize" in data &&
		isNonNegativeNumber(data.fontSize) &&
		"fontFamily" in data &&
		isString(data.fontFamily) &&
		"fontWeight" in data &&
		isString(data.fontWeight)
	);
};
