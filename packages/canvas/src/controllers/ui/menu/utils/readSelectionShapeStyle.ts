import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type { ShapeStyleGroup } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";

import { collectSelectionObjects } from "./collectSelectionObjects";
import { getSelectedShapeStyle } from "./getSelectedShapeStyle";
import type { SelectionValue } from "./SelectionValue";
import { combineSelectionValues } from "./SelectionValue";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { StyleIntentRegistries } from "../../../style/ObjectStyleRegistry";
import { readSelectionStyle } from "../../../style/readSelectionStyle";

/**
 * The dash a stroke nobody declared one for is drawn with. A resolved style
 * leaves `strokeDashType` absent in that case, and the rows draw it as solid —
 * so it is named here, otherwise an explicit `"solid"` and an omitted dash would
 * read as two values.
 */
export const UNDECLARED_STROKE_DASH: StrokeDashType = "solid";

/** What the selection says about each field of the stroke and fill. */
export type SelectionShapeStyle = {
	/** Stroke color, `"auto"` included: the sentinel is a value like any other, the theme resolving it identically everywhere. */
	stroke: SelectionValue<string>;
	/** Stroke width in pixels. */
	strokeWidth: SelectionValue<number>;
	/** Dash pattern, with an undeclared one read as `"solid"`. */
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
 * Every object is resolved through {@link getSelectedShapeStyle} on its own,
 * so the comparison is between the colors and widths the shapes are actually
 * drawn with: a shape stating `#fff` and one whose type defaults to `#fff` read
 * as one value, not two.
 *
 * `fill` is the one field already answered by the style tables
 * ({@link readSelectionStyle}); the rest follow as their intents move over, and
 * this whole function goes with the last of them.
 *
 * @param state - The canvas state; a selected group contributes its descendants too, and a selected connector answers for itself on the rows it declares
 * @param registries - The canvas's style tables and shape-style defaults, the latter consulted per object by its own type
 * @param styleGroup - Which group decides who has a say: `"stroke"` for the outline rows, `"fill"` for the face ones. Every field is answered either way, but only the group's own fields were narrowed to the objects that declare them — except `fill`, already narrowed by its own intent
 * @returns Every field; each is `none` when no object of the selection declares `styleGroup` (`fill`: declares a fill)
 */
export const readSelectionShapeStyle = (
	state: CanvasControllerState,
	registries: StyleIntentRegistries,
	styleGroup: ShapeStyleGroup,
): SelectionShapeStyle => {
	const { objects } = state;
	const strokes: string[] = [];
	const strokeWidths: number[] = [];
	const strokeDashTypes: StrokeDashType[] = [];
	const strokeOpacities: number[] = [];
	const fillOpacities: number[] = [];

	for (const object of collectSelectionObjects(
		state.selection.objectIds,
		objects,
	)) {
		if (!object.features?.[styleGroup]) {
			continue;
		}
		const style = getSelectedShapeStyle(
			[object.id],
			{ [object.id]: object },
			registries.objectShapeStyleDefaults,
			styleGroup,
		);
		strokes.push(style.stroke);
		strokeWidths.push(style.strokeWidth);
		strokeDashTypes.push(style.strokeDashType ?? UNDECLARED_STROKE_DASH);
		strokeOpacities.push(style.strokeOpacity);
		fillOpacities.push(style.fillOpacity);
	}

	return {
		stroke: combineSelectionValues(strokes),
		strokeWidth: combineSelectionValues(strokeWidths),
		strokeDashType: combineSelectionValues(strokeDashTypes),
		strokeOpacity: combineSelectionValues(strokeOpacities),
		// Read through the fill intent whatever `styleGroup` is, so this field is
		// narrowed to the objects that declare a fill — the set a write reaches —
		// rather than to whoever declares the group asked for.
		fill: readSelectionStyle(state, "fill", registries),
		fillOpacity: combineSelectionValues(fillOpacities),
	};
};
