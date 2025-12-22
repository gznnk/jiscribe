import { useEffect, useRef } from "react";

import { APPEND_DIAGRAMS_EVENT_NAME } from "../../../constants/core/EventNames";
import type { AppendDiagramsEvent } from "../../../types/events/AppendDiagramsEvent";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { appendDiagrams } from "../../utils/appendDiagrams";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { removeDiagramsById } from "../../utils/removeDiagramsById";
import { updateOutlineOfAllItemables } from "../../utils/updateOutlineOfAllItemables";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle AppendDiagramsEvent on the canvas.
 * Listens for the event and updates the canvas state accordingly.
 */
export const useOnAppendDiagrams = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	useEffect(() => {
		// Bypass references to avoid function creation in every render
		const { eventBus } = refBus.current.props;

		// Listener for AppendDiagramsEvent
		const appendDiagramsListener = (e: Event) => {
			// Bypass references to avoid function creation in every render
			const {
				props: { setCanvasState },
				addHistory,
			} = refBus.current;

			const event = (e as CustomEvent<AppendDiagramsEvent>).detail;

			// Update the canvas state
			setCanvasState((prevState) => {
				// 1. Get target diagram
				const targetDiagram = getDiagramById(prevState.items, event.targetId);
				if (!targetDiagram) {
					console.warn(`Target diagram with id ${event.targetId} not found`);
					return prevState;
				}

				// Extract IDs of diagrams to move
				const diagramIds = event.diagrams.map((diagram) => diagram.id);

				// 2. Remove source diagrams from their current locations
				const diagramsRemovedItems = removeDiagramsById(
					prevState.items,
					diagramIds,
				);

				// 3. Append diagrams to target diagram (diagrams are in absolute coordinates)
				const diagramsAppendedItems = appendDiagrams(
					diagramsRemovedItems,
					event.targetId,
					event.diagrams,
				);

				// 4. Clean up empty groups
				const groupsCleanedUpItems = cleanupGroups(diagramsAppendedItems);

				// Update outlines
				const updatedItems = updateOutlineOfAllItemables(groupsCleanedUpItems);

				// Create new state with updated items
				let newState = {
					...prevState,
					items: updatedItems,
				};

				// Add history
				newState = addHistory(event.eventId, newState);

				return newState;
			});
		};

		// Add the event listener
		eventBus.addEventListener(
			APPEND_DIAGRAMS_EVENT_NAME,
			appendDiagramsListener,
		);

		// Cleanup the event listener on component unmount
		return () => {
			eventBus.removeEventListener(
				APPEND_DIAGRAMS_EVENT_NAME,
				appendDiagramsListener,
			);
		};
	}, []);
};
