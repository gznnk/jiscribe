import { useCallback } from "react";

import { APPEND_DIAGRAMS_EVENT_NAME } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import type { AppendDiagramsEvent } from "../types/events/AppendDiagramsEvent";
import type { Diagram } from "../types/state/core/Diagram";
import { newEventId } from "../utils/core/newEventId";

/**
 * Hook for appending multiple diagrams to a target diagram via drag and drop.
 * Dispatches AppendDiagramsEvent to the event bus.
 * Diagrams are assumed to have absolute coordinates.
 */
export const useAppendDiagrams = () => {
	// Get EventBus instance from context
	const eventBus = useEventBus();

	// Function to dispatch a new AppendDiagramsEvent
	return useCallback(
		(targetId: string, diagrams: Diagram[]) => {
			const event: AppendDiagramsEvent = {
				eventId: newEventId(),
				targetId,
				diagrams,
			};

			// Dispatch the AppendDiagramsEvent to the EventBus
			eventBus.dispatchEvent(
				new CustomEvent(APPEND_DIAGRAMS_EVENT_NAME, { detail: event }),
			);
		},
		[eventBus],
	);
};
