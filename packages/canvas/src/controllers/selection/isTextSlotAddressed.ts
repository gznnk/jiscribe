import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import { resolveSelectedTextSlotIds } from "./resolveSelectedTextSlotIds";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether what is picked one level below the object stands for text slots — the
 * picked slots themselves, or a kind covering some
 * (`ObjectPartKindDefinition.textSlotIds`). The gate the menus, the sidebar and
 * the overlays read to narrow themselves to text, so a pick of another sort (a
 * vertex) leaves them stating the object as a whole.
 *
 * @param state - The current canvas controller state; its `objectPartSelection`
 *   is read as it stands, the reducer having already dropped a stale one
 *   (reconcileObjectPartSelection)
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, asked for the
 *   picked kind under the selected object's type
 * @returns True only while a kind covering slots is picked; false when nothing
 *   is picked below the object
 */
export const isTextSlotAddressed = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): boolean => {
	const { objectPartSelection } = state;
	if (objectPartSelection === null) {
		return false;
	}
	const object = state.objects[objectPartSelection.objectId];
	return (
		object !== undefined &&
		resolveSelectedTextSlotIds(object, objectPartSelection, objectPartKind) !==
			undefined
	);
};
