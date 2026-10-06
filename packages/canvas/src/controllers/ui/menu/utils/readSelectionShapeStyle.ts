import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";

import type { SelectionValue } from "./SelectionValue";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { StyleIntentRegistries } from "../../../style/ObjectStyleRegistry";
import { readSelectionStyle } from "../../../style/readSelectionStyle";

/** What the selection says about each field of the stroke and fill. */
export type SelectionShapeStyle = {
	/** Stroke color, `"auto"` included: the sentinel is a value like any other, the theme resolving it identically everywhere. */
	stroke: SelectionValue<string>;
	/** Stroke width in pixels. */
	strokeWidth: SelectionValue<number>;
	/** Dash pattern, an undeclared one read as solid (SHAPE_STYLE_FALLBACK). */
	strokeDashType: SelectionValue<StrokeDashType>;
	/** How opaque the stroke is drawn, 0..1 as the document states it. */
	strokeOpacity: SelectionValue<number>;
	/** Fill color, `"auto"` and `"transparent"` included. */
	fill: SelectionValue<string>;
	/** How opaque the fill is drawn, 0..1 as the document states it. */
	fillOpacity: SelectionValue<number>;
};

/**
 * What the whole selection says about its stroke and fill.
 *
 * Every field is read through its own intent ({@link readSelectionStyle}), so
 * each row states the value of exactly the objects a write to it would reach,
 * and each value comes out resolved through its object's type defaults: a shape
 * stating `#fff` and one whose type defaults to `#fff` read as one value, not
 * two. Nothing here is specific to the six fields any more, so this whole
 * function goes once its callers ask for the one field each of them draws.
 *
 * @param state - The canvas state; a selected group contributes its descendants too, and a selected connector answers for itself on the rows it declares
 * @param registries - The canvas's style tables and the defaults their entries resolve through
 * @returns Every field; one is `none` when no object the selection reaches takes that field's intent
 */
export const readSelectionShapeStyle = (
	state: CanvasControllerState,
	registries: StyleIntentRegistries,
): SelectionShapeStyle => ({
	stroke: readSelectionStyle(state, "stroke", registries),
	strokeWidth: readSelectionStyle(state, "strokeWidth", registries),
	strokeDashType: readSelectionStyle(state, "strokeDashType", registries),
	strokeOpacity: readSelectionStyle(state, "strokeOpacity", registries),
	fill: readSelectionStyle(state, "fill", registries),
	fillOpacity: readSelectionStyle(state, "fillOpacity", registries),
});
