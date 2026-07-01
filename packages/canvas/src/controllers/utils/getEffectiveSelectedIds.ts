import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Returns the effective list of selected IDs based on the selection state.
 * When a connector is selected (selectedConnectorId != null), returns
 * [selectedConnectorId] instead of selectedIds.
 *
 * Inside useMemo, passing { selectedIds, selectedConnectorId } avoids depending
 * on the whole state.
 */
export function getEffectiveSelectedIds(
	state: Pick<CanvasControllerState, "selectedIds" | "selectedConnectorId">,
): string[] {
	// Treat both null and undefined as "no connector selected"
	// (in a partial state, selectedConnectorId may be omitted and become undefined).
	if (state.selectedConnectorId != null) {
		return [state.selectedConnectorId];
	}
	return state.selectedIds;
}
