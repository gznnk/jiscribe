import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

import { theme } from "../../../../../constants/theme";

/**
 * Resolves the render color for the label background (fill).
 * When omitted or `"auto"`, uses the canvas background color (the default that
 * knocks out the line behind it). A concrete color is used as-is (choosing
 * `"transparent"` lets the line show through). Shared so display and editing
 * produce the same result.
 */
export const resolveLabelFill = (fill?: string): string =>
	fill === undefined || fill === AUTO_COLOR ? theme.canvasBg : fill;
