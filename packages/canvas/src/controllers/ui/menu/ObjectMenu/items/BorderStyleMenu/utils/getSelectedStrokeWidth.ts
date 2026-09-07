import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";

import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithFeature } from "../../../utils/getFirstSelectedWithFeature";

/**
 * The stroke width the menu shows: the selected object's own, resolved through
 * its type's own defaults (ObjectShapeStyleDefaultsRegistry) so what the menu
 * shows is what the shape draws.
 *
 * @param state - The current canvas controller state; the first selected object whose type declares a stroke is the one read (descendants of a selected group included), whether or not it wrote a width
 * @param shapeStyleDefaults - Per-canvas ObjectShapeStyleDefaultsRegistry, keyed by the type of whichever object was found
 * @returns The width in pixels; SHAPE_STYLE_FALLBACK's when nothing is selected or the value found is not a number
 */
export const getSelectedStrokeWidth = (
	state: CanvasControllerState,
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry,
): number => {
	const selected = getFirstSelectedWithFeature(
		state.selectedIds,
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
