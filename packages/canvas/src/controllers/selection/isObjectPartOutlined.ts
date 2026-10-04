import type { CanvasSelection } from "./CanvasSelection";
import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Whether the selected parts are drawn with a box around them — that is, whether
 * their type declares a `region` for the selected kind
 * ({@link import("./ObjectPartKindRegistry").ObjectPartKindDefinition}).
 *
 * What the transform handles are hidden on: they act on the whole object, so a box
 * drawn inside it competes with them for the eye. A kind that outlines nothing —
 * a point a shape is dragged by, say — leaves nothing to compete, and the handles
 * stay.
 *
 * @param objects - The canvas's objects, for looking the selection's owner up by id
 * @param registry - The part registry the owner's type declared its kinds in
 * @param selection - What the canvas is pointed at (`state.selection`, whose
 *   `part` the reducer keeps valid); a null `part` answers false, there being
 *   none to outline, and the part's owner is the sole selected object
 * @returns True only when a part is selected and its kind is one the overlay draws a box for
 */
export const isObjectPartOutlined = (
	objects: Readonly<Record<string, ObjectState>>,
	registry: ObjectPartKindRegistry,
	selection: CanvasSelection,
): boolean => {
	const { objectIds, part } = selection;
	if (part === null) {
		return false;
	}
	const owner = objects[objectIds[0]];
	if (owner === undefined) {
		return false;
	}
	return registry.get(owner.type, part.kind)?.region !== undefined;
};
