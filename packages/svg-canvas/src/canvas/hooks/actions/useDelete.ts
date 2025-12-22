import { useCallback, useRef } from "react";

import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { collectDiagramIds } from "../../../utils/core/collectDiagramIds";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { newEventId } from "../../../utils/core/newEventId";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { removeSelectedDiagrams } from "../../utils/removeSelectedDiagrams";
import { updateOutlineOfAllItemables } from "../../utils/updateOutlineOfAllItemables";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle delete events on the canvas.
 */
export const useDelete = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Return a callback function to handle the delete action.
	return useCallback(() => {
		// Bypass references to avoid function creation in every render.
		const {
			props: { setCanvasState },
			addHistory,
		} = refBus.current;

		setCanvasState((prevState) => {
			const selectedDiagrams = getSelectedDiagrams(prevState.items);
			const deletedItemIds = collectDiagramIds(selectedDiagrams);
			const selectedRemovedItems = removeSelectedDiagrams(prevState.items);

			// Remove ConnectLine components whose owner was deleted.
			const orphanedConnectionsRemovedItems = selectedRemovedItems.filter(
				(item) => {
					if (item.type === "ConnectLine") {
						const connectLine = item as ConnectLineState;
						return (
							!deletedItemIds.has(connectLine.startOwnerId) &&
							!deletedItemIds.has(connectLine.endOwnerId)
						);
					}
					return true;
				},
			);

			const groupsCleanedUpItems = cleanupGroups(
				orphanedConnectionsRemovedItems,
			);

			const outlineUpdatedItems =
				updateOutlineOfAllItemables(groupsCleanedUpItems);

			let nextState = {
				...prevState,
				items: outlineUpdatedItems,
				multiSelectGroup: undefined, // Hide the multi-select group because the selected items were deleted.
				selectedDiagramPathIndex: new Map(), // Clear path index since all selected items were deleted.
			} as SvgCanvasState;

			const eventId = newEventId();
			nextState = addHistory(eventId, nextState);

			return nextState;
		});
	}, []);
};
