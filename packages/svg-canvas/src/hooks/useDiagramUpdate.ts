import { useCallback } from "react";

import { DIAGRAM_UPDATE_EVENT_NAME } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import type { DiagramUpdateEvent } from "../types/events/DiagramUpdateEvent";

/**
 * Hook that returns a function to dispatch diagram update events via the event bus.
 * This allows components to trigger programmatic diagram updates without direct coupling.
 * Unlike DiagramChangeEvent, this is for non-interactive updates without event phases.
 */
export const useDiagramUpdate = () => {
	const eventBus = useEventBus();

	return useCallback(
		(event: DiagramUpdateEvent) => {
			eventBus.dispatchEvent(
				new CustomEvent(DIAGRAM_UPDATE_EVENT_NAME, { detail: event }),
			);
		},
		[eventBus],
	);
};
