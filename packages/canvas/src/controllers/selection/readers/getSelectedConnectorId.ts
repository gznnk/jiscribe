import type { CanvasControllerState } from "../../CanvasTypes";

/**
 * The selected connector, or null while the selection is not one.
 *
 * A connector is only ever selected on its own (see
 * {@link CanvasControllerState.selection.objectIds}), so a non-null answer also says
 * that the selection is that one connector and nothing else.
 *
 * @param state - The selection and the objects it names; a `selection.objectIds` holding anything but a single object of type `connector` gives null
 * @returns The connector's id, which `state.objects` is guaranteed to hold, or null
 */
export const getSelectedConnectorId = (
	state: Pick<CanvasControllerState, "selection" | "objects">,
): string | null => {
	if (state.selection.objectIds.length !== 1) {
		return null;
	}
	const [selectedId] = state.selection.objectIds;
	return state.objects[selectedId]?.type === "connector" ? selectedId : null;
};
