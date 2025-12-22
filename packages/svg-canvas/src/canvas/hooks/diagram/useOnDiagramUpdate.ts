import { useRef, useEffect } from "react";

import { DIAGRAM_UPDATE_EVENT_NAME } from "../../../constants/core/EventNames";
import type { DiagramUpdateEvent } from "../../../types/events/DiagramUpdateEvent";
import { collectDiagramIds } from "../../../utils/core/collectDiagramIds";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { collectConnectedConnectLines } from "../../../utils/shapes/connectLine/collectConnectedConnectLines";
import { updateConnectLinesByIds } from "../../../utils/shapes/connectLine/updateConnectLinesByIds";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { updateDiagramConnectPoints } from "../../utils/updateDiagramConnectPoints";
import { updateOutlineOfAllItemables } from "../../utils/updateOutlineOfAllItemables";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle diagram update events on the canvas.
 * Listens to DIAGRAM_UPDATE_EVENT_NAME from the event bus and applies updates.
 * Unlike useOnDiagramChange, this handler is for direct, non-interactive updates
 * without event phases (Started/InProgress/Ended).
 */
export const useOnDiagramUpdate = (props: SvgCanvasSubHooksProps) => {
	const { eventBus, setCanvasState } = props;

	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		eventBus,
		setCanvasState,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Listen to diagram update events from the event bus
	useEffect(() => {
		const { eventBus } = refBus.current;

		const handleEvent = (event: Event) => {
			const customEvent = event as CustomEvent<DiagramUpdateEvent>;
			const e = customEvent.detail;

			// Bypass references to avoid function creation in every render.
			const { setCanvasState, addHistory } = refBus.current;

			setCanvasState((prevState) => {
				// Find the diagram being updated
				const updatedDiagram = getDiagramById(prevState.items, e.id);

				// Collect all diagram IDs (updated diagram + its descendants)
				const allUpdatedDiagramIds = updatedDiagram
					? collectDiagramIds([updatedDiagram])
					: new Set<string>([e.id]);

				// Collect ConnectLine IDs that are connected to the updated diagrams
				const connectLineIds = collectConnectedConnectLines(
					prevState.items,
					allUpdatedDiagramIds,
				);

				// Create a new state with the updated items
				let newState = {
					...prevState,
					items: applyFunctionRecursively(prevState.items, (item) => {
						// If the id does not match, return the original item.
						if (item.id !== e.id) return item;

						// If the id matches, update the item with the new properties.
						let newItem = { ...item, ...e.data };

						// Update connect points for the updated diagram
						newItem = updateDiagramConnectPoints(newItem);

						// Return the updated item.
						return newItem;
					}),
				};

				newState.items = updateOutlineOfAllItemables(newState.items);

				// Update the connect lines
				newState = updateConnectLinesByIds(connectLineIds, newState, prevState);

				// Add history for programmatic updates unless skipHistory is true
				if (!e.skipHistory) {
					newState = addHistory(e.eventId, newState);
				}

				return newState;
			});
		};

		eventBus.addEventListener(DIAGRAM_UPDATE_EVENT_NAME, handleEvent);

		return () => {
			eventBus.removeEventListener(DIAGRAM_UPDATE_EVENT_NAME, handleEvent);
		};
	}, []);
};
