import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import type {
	ObjectShapeStyleDefaultsRegistry,
	ResolvedShapeStyle,
	ShapeStyleGroup,
} from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";

import { getFirstSelectedWithStyleGroup } from "./getFirstSelectedWithStyleGroup";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { pickShapeStyleFields } from "../../../utils/pickShapeStyleFields";

const NOTHING_SELECTED: ResolvedShapeStyle = { ...SHAPE_STYLE_FALLBACK };

/**
 * The style of the first selected object that declares `styleGroup`: its own
 * fields resolved through its type's defaults
 * (ObjectShapeStyleDefaultsRegistry), so what is read is what the object draws.
 * For plugin menus that state one object's style; the built-in rows read the
 * whole selection through the style intents instead (readSelectionStyle), which
 * is what lets them tell one value from several.
 *
 * The object's own fields are read through `pickShapeStyleFields`, which is what
 * drops a field the state carries with the wrong type and lets resolution take
 * over for it.
 *
 * @param selectedIds - The selection, in the order the first match is taken from; a selected group is searched down into its descendants
 * @param objects - Every object of the canvas, keyed by id; ids not in it are skipped
 * @param shapeStyleDefaults - Per-canvas ObjectShapeStyleDefaultsRegistry, keyed by the type of whichever object was found
 * @param styleGroup - Which style group the object is searched by: `"stroke"` for the outline menus, `"fill"` for the face ones. Every field is answered either way, but only the ones of the group searched by are the ones the found object was chosen for
 * @returns The resolved style; SHAPE_STYLE_FALLBACK (whose `strokeDashType` is undefined) when nothing selected declares the group
 */
export const getSelectedShapeStyle = (
	selectedIds: readonly string[],
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
	return shapeStyleDefaults.resolveShapeStyle(
		selected.type,
		pickShapeStyleFields(selected),
	);
};
