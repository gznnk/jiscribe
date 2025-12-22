import { useEffect, useRef } from "react";

import { EXTRACT_DIAGRAMS_TO_TOP_LEVEL_EVENT_NAME } from "../../../constants/core/EventNames";
import type { ExtractDiagramsToTopLevelEvent } from "../../../types/events/ExtractDiagramsToTopLevelEvent";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { cleanupGroups } from "../../utils/cleanupGroups";
import { removeDiagramsById } from "../../utils/removeDiagramsById";
import { updateOutlineOfAllItemables } from "../../utils/updateOutlineOfAllItemables";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle ExtractDiagramsToTopLevelEvent on the canvas.
 * Listens for the event and extracts specified diagrams to the top level.
 */
export const useOnExtractDiagramsToTopLevel = (
	props: SvgCanvasSubHooksProps,
) => {
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

		// Listener for ExtractDiagramsToTopLevelEvent
		const extractDiagramsToTopLevelListener = (e: Event) => {
			// Bypass references to avoid function creation in every render
			const {
				props: { setCanvasState },
				addHistory,
			} = refBus.current;

			const event = (e as CustomEvent<ExtractDiagramsToTopLevelEvent>).detail;

			// Update the canvas state
			setCanvasState((prevState) => {
				// Get diagrams from the event
				const diagrams = event.diagrams;
				if (diagrams.length === 0) {
					console.warn("No diagrams specified in the event");
					return prevState;
				}

				// Extract IDs of diagrams to remove from their current locations
				const diagramIds = diagrams.map((d) => d.id);

				// 1. Remove diagrams from their current locations
				const diagramsRemovedItems = removeDiagramsById(
					prevState.items,
					diagramIds,
				);

				// 2. Add diagrams to top level (coordinates are already absolute)
				const updatedItems = [...diagramsRemovedItems, ...diagrams];

				// 4. Clean up empty groups
				const groupsCleanedUpItems = cleanupGroups(updatedItems);

				// Update outlines
				const itemsWithUpdatedOutlines =
					updateOutlineOfAllItemables(groupsCleanedUpItems);

				// Create new state with updated items
				let newState = {
					...prevState,
					items: itemsWithUpdatedOutlines,
				};

				// Add history
				newState = addHistory(event.eventId, newState);

				return newState;
			});
		};

		// Add the event listener
		eventBus.addEventListener(
			EXTRACT_DIAGRAMS_TO_TOP_LEVEL_EVENT_NAME,
			extractDiagramsToTopLevelListener,
		);

		// Cleanup the event listener on component unmount
		return () => {
			eventBus.removeEventListener(
				EXTRACT_DIAGRAMS_TO_TOP_LEVEL_EVENT_NAME,
				extractDiagramsToTopLevelListener,
			);
		};
	}, []);
};
