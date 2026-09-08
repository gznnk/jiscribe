import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import type {
	ObjectShapeStyleDefaultsRegistry,
	ShapeStyleGroup,
} from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";

import { collectSelectionObjects } from "./collectSelectionObjects";
import type { SelectionValue } from "./SelectionValue";
import { combineSelectionValues } from "./SelectionValue";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { getSelectedShapeStyle } from "../../ObjectMenu/utils/getSelectedShapeStyle";

/**
 * The dash a stroke nobody declared one for is drawn with. A resolved style
 * leaves `strokeDashType` absent in that case, and the rows draw it as solid —
 * so it is named here, otherwise an explicit `"solid"` and an omitted dash would
 * read as two values.
 */
const UNDECLARED_STROKE_DASH: StrokeDashType = "solid";

/** What the selection says about each field of the stroke and fill. */
export type SelectionShapeStyle = {
	/** Stroke color, `"auto"` included: the sentinel is a value like any other, the theme resolving it identically everywhere. */
	stroke: SelectionValue<string>;
	/** Stroke width in pixels. */
	strokeWidth: SelectionValue<number>;
	/** Dash pattern, with an undeclared one read as `"solid"`. */
	strokeDashType: SelectionValue<StrokeDashType>;
	/** Fill color, `"auto"` and `"transparent"` included. */
	fill: SelectionValue<string>;
};

/**
 * What the whole selection says about its stroke and fill.
 *
 * Every object is resolved through {@link getSelectedShapeStyle}, the same
 * reader the single-value rows use, so the comparison is between the colors and
 * widths the shapes are actually drawn with: a shape stating `#fff` and one
 * whose type defaults to `#fff` read as one value, not two.
 *
 * @param selectedIds - The selection; a selected group contributes its descendants too. Pass the effective ids (getEffectiveSelectedIds) for the rows a connector also answers
 * @param objects - Every object of the canvas, keyed by id
 * @param shapeStyleDefaults - Per-canvas ObjectShapeStyleDefaultsRegistry, consulted per object by its own type
 * @param styleGroup - Which group decides who has a say: `"stroke"` for the outline rows, `"fill"` for the face one. All four fields are answered either way, but only the group's own fields were narrowed to the objects that declare them
 * @returns All four fields; each is `none` when no object of the selection declares `styleGroup`
 */
export const readSelectionShapeStyle = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry,
	styleGroup: ShapeStyleGroup,
): SelectionShapeStyle => {
	const strokes: string[] = [];
	const strokeWidths: number[] = [];
	const strokeDashTypes: StrokeDashType[] = [];
	const fills: string[] = [];

	for (const object of collectSelectionObjects(selectedIds, objects)) {
		if (!object.features?.[styleGroup]) {
			continue;
		}
		const style = getSelectedShapeStyle(
			[object.id],
			{ [object.id]: object },
			shapeStyleDefaults,
			styleGroup,
		);
		strokes.push(style.stroke);
		strokeWidths.push(style.strokeWidth);
		strokeDashTypes.push(style.strokeDashType ?? UNDECLARED_STROKE_DASH);
		fills.push(style.fill);
	}

	return {
		stroke: combineSelectionValues(strokes),
		strokeWidth: combineSelectionValues(strokeWidths),
		strokeDashType: combineSelectionValues(strokeDashTypes),
		fill: combineSelectionValues(fills),
	};
};
