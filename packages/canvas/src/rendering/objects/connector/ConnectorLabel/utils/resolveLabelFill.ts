import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

import { theme } from "../../../../../foundation/theme/themeTokens";

/**
 * Resolves the render color for the label background (fill).
 * When omitted or `"auto"`, uses `theme.canvasBg`, which the Canvas root sets to
 * the document's opaque `background` when it has one (see Canvas), so the box
 * knocks out the line behind it in the page's color. A concrete color is used as-is (choosing
 * `"transparent"` lets the line show through). Shared so display and editing
 * produce the same result.
 */
export const resolveLabelFill = (fill?: string): string =>
	fill === undefined || fill === AUTO_COLOR ? theme.canvasBg : fill;
