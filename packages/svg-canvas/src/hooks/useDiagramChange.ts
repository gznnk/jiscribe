import { useCallback } from "react";

import { DIAGRAM_CHANGE_EVENT_NAME } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import type { DiagramChangeEvent } from "../types/events/DiagramChangeEvent";

/**
 * Hook that returns a function to dispatch diagram change events via the event bus.
 * This allows components to trigger diagram change events with event phases (Started/InProgress/Ended).
 * Unlike DiagramUpdateEvent, this supports interactive updates with event phases.
 */
export const useDiagramChange = () => {
	const eventBus = useEventBus();

	return useCallback(
		(event: DiagramChangeEvent) => {
			eventBus.dispatchEvent(
				new CustomEvent(DIAGRAM_CHANGE_EVENT_NAME, { detail: event }),
			);
		},
		[eventBus],
	);
};
