import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

/**
 * Resolves the render color for the label background (fill). Shared so the
 * label, its inline editor and the label-fill swatches produce the same result.
 *
 * @param fill the label's `fill`; omitted or `"auto"` gives `documentSurface`,
 *   so the box knocks out the line behind it in the page's color. A concrete
 *   color is returned as-is (`"transparent"` lets the line show through)
 * @param documentSurface the color of the page behind the label, from
 *   useDocumentSurface
 */
export const resolveLabelFill = (
	fill: string | undefined,
	documentSurface: string,
): string =>
	fill === undefined || fill === AUTO_COLOR ? documentSurface : fill;
