import { isNumber, isString } from "@jiscribe/basic-validators";
import { isStrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import type {
	ObjectShapeStyleDefaultsRegistry,
	ResolvedShapeStyle,
	ShapeStyleGroup,
} from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";

import { getFirstSelectedWithStyleGroup } from "./getFirstSelectedWithStyleGroup";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

const NOTHING_SELECTED: ResolvedShapeStyle = { ...SHAPE_STYLE_FALLBACK };

/**
 * The stroke and fill a style menu shows: the found object's own fields resolved
 * through its type's defaults (ObjectShapeStyleDefaultsRegistry) so what the
 * menu shows is what the object draws.
 *
 * The single place that reads the style fields off an ObjectState, which is why
 * the cast to a bag of unknown values lives here: a field the state carries with
 * the wrong type is dropped rather than passed on, and resolution takes over.
 *
 * @param selectedIds - The selection, in the order the first match is taken from; a selected group is searched down into its descendants
 * @param objects - Every object of the canvas, keyed by id; ids not in it are skipped
 * @param shapeStyleDefaults - Per-canvas ObjectShapeStyleDefaultsRegistry, keyed by the type of whichever object was found
 * @param styleGroup - Which style group the object is searched by: `"stroke"` for the outline menus, `"fill"` for the face ones. Every field is answered either way, but only the ones of the group searched by are the ones the found object was chosen for
 * @returns The resolved style; SHAPE_STYLE_FALLBACK (whose `strokeDashType` is undefined) when nothing selected declares the group
 */
export const getSelectedShapeStyle = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry,
	styleGroup: ShapeStyleGroup,
): ResolvedShapeStyle => {
	const selected = getFirstSelectedWithStyleGroup(
		selectedIds,
		objects,
		styleGroup,
	);
	if (selected === undefined) {
		return NOTHING_SELECTED;
	}
	const own = selected as Record<string, unknown>;
	return shapeStyleDefaults.resolveShapeStyle(selected.type, {
		stroke: isString(own.stroke) ? own.stroke : undefined,
		strokeWidth: isNumber(own.strokeWidth) ? own.strokeWidth : undefined,
		strokeDashType: isStrokeDashType(own.strokeDashType)
			? own.strokeDashType
			: undefined,
		strokeOpacity: isNumber(own.strokeOpacity) ? own.strokeOpacity : undefined,
		fill: isString(own.fill) ? own.fill : undefined,
		fillOpacity: isNumber(own.fillOpacity) ? own.fillOpacity : undefined,
	});
};
