import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";

import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../../controllers/utils/getEffectiveSelectedIds";
import { getFirstSelectedWithFeature } from "../../../utils/getFirstSelectedWithFeature";

/**
 * The stroke width the line menu shows — the selection's, or the connector's
 * when one is selected — resolved through the object type's own defaults
 * (ObjectShapeStyleDefaultsRegistry) so what the menu shows is what the line
 * draws.
 *
 * @param state - The current canvas controller state; a selected connector takes precedence over the selection (getEffectiveSelectedIds), and the object is found by its declared stroke rather than by a written width
 * @param shapeStyleDefaults - Per-canvas ObjectShapeStyleDefaultsRegistry, keyed by the type of whichever object was found
 * @returns The width in pixels; SHAPE_STYLE_FALLBACK's when nothing is selected or the value found is not a number
 */
export const getSelectedStrokeWidth = (
	state: CanvasControllerState,
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry,
): number => {
	const selected = getFirstSelectedWithFeature(
		getEffectiveSelectedIds(state),
		state.objects,
		"stroke",
	);
	if (selected === undefined) {
		return SHAPE_STYLE_FALLBACK.strokeWidth;
	}
	const ownStrokeWidth = (selected as Record<string, unknown>).strokeWidth;
	return shapeStyleDefaults.resolveShapeStyle(selected.type, {
		strokeWidth:
			typeof ownStrokeWidth === "number" ? ownStrokeWidth : undefined,
	}).strokeWidth;
};
