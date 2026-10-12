import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ObjectStyleRegistry } from "../../../style/tables/ObjectStyleRegistry";

const NO_KINDS: ReadonlySet<string> = new Set();

/**
 * The style kinds the text-addressed object's type declares itself
 * (ObjectStyleRegistry.declaredKinds): what decides which non-text controls the
 * text-slot narrowing keeps (filterTextSlotMenuSections).
 *
 * The addressed object is `selection.objectIds[0]` whenever a text slot is
 * picked: the picked text slot belongs to the sole selected object
 * (CanvasSelection.part), an open shape text edit included
 * (CanvasControllerState.textEditState).
 *
 * @param state - The current canvas controller state; meant to be read while a text slot is picked (isTextSlotPart)
 * @param objectStyleRegistry - Per-canvas ObjectStyleRegistry the declared kinds are read from
 * @returns Empty when the selection does not hold exactly one object that is still in `objects`
 */
export const getAddressedDeclaredKinds = (
	state: CanvasControllerState,
	objectStyleRegistry: ObjectStyleRegistry,
): ReadonlySet<string> => {
	const { objectIds } = state.selection;
	if (objectIds.length !== 1) {
		return NO_KINDS;
	}
	const addressed = state.objects[objectIds[0]];
	if (addressed === undefined) {
		return NO_KINDS;
	}
	return objectStyleRegistry.declaredKinds(addressed.type);
};
