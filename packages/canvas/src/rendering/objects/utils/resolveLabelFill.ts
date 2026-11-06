import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

/**
 * Resolves the render color for a label's background: a connector label's
 * `fill`, or the `labelFill` a `text: "label"` caption is painted on. Shared so
 * the labels, the connector label's inline editor and the label-fill swatches
 * produce the same result.
 *
 * @param fill the label's background as stored; omitted or `"auto"` gives
 *   `documentSurface`, so the box knocks out what lies behind it in the page's
 *   color. A concrete color is returned as-is (`"transparent"` lets it show through)
 * @param documentSurface the color of the page behind the label, from
 *   useDocumentSurface
 */
export const resolveLabelFill = (
	fill: string | undefined,
	documentSurface: string,
): string =>
	fill === undefined || fill === AUTO_COLOR ? documentSurface : fill;
