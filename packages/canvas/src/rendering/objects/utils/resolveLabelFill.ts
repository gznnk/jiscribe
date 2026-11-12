import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";

/**
 * Whether a label's background, as stored, is the knockout: omitted or
 * `"auto"`. Such a label is painted on the page's color with the frames it lies
 * on over it (LabelBackdropLayers); any other value is painted as it is.
 *
 * @param value a connector label's `fill` or a caption's `labelFill`, as stored
 */
export const isAutoLabelFill = (
	value: string | undefined,
): value is typeof AUTO_COLOR | undefined =>
	value === undefined || value === AUTO_COLOR;

/**
 * Resolves the render color for a label's background: a connector label's
 * `fill`, or the `labelFill` a `text: "label"` caption is painted on. Shared so
 * the labels, the connector label's inline editor and the label-fill swatches
 * produce the same result.
 *
 * @param fill the label's background as stored; omitted or `"auto"` gives
 *   `documentSurface`, so the box knocks out what lies behind it in the page's
 *   color, the frames it lies on then being painted over it by the label
 *   (LabelBackdropLayers). A concrete color is returned as-is (`"transparent"`
 *   lets it show through)
 * @param documentSurface the color of the page behind the label, from
 *   useDocumentSurface
 */
export const resolveLabelFill = (
	fill: string | undefined,
	documentSurface: string,
): string => (isAutoLabelFill(fill) ? documentSurface : fill);
