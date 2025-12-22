import { useCallback } from "react";

import { EXTRACT_DIAGRAMS_TO_TOP_LEVEL_EVENT_NAME } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import type { ExtractDiagramsToTopLevelEvent } from "../types/events/ExtractDiagramsToTopLevelEvent";
import type { Diagram } from "../types/state/core/Diagram";
import { newEventId } from "../utils/core/newEventId";

/**
 * Hook for extracting specified diagrams to the top level.
 * Dispatches ExtractDiagramsToTopLevelEvent to the event bus.
 * Diagrams are provided directly by the caller.
 */
export const useExtractDiagramsToTopLevel = () => {
	// Get EventBus instance from context
	const eventBus = useEventBus();

	// Function to dispatch a new ExtractDiagramsToTopLevelEvent
	return useCallback(
		(diagrams: Diagram[], eventId?: string) => {
			const event: ExtractDiagramsToTopLevelEvent = {
				eventId: eventId ?? newEventId(),
				diagrams,
			};

			// Dispatch the ExtractDiagramsToTopLevelEvent to the EventBus
			eventBus.dispatchEvent(
				new CustomEvent(EXTRACT_DIAGRAMS_TO_TOP_LEVEL_EVENT_NAME, {
					detail: event,
				}),
			);
		},
		[eventBus],
	);
};
