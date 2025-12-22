import type { EventBus } from "@workspace/event-bus";
import { useCallback } from "react";

import { ADD_NEW_DIAGRAM_EVENT_NAME } from "../constants/core/EventNames";
import type { AddDiagramEvent } from "../types/events/AddDiagramEvent";
import type { Diagram } from "../types/state/core/Diagram";
import { newEventId } from "../utils/core/newEventId";

/**
 * Returns a callback for tool modules to dispatch an AddDiagramEvent using the provided eventBus.
 * @param eventBus - The EventBus instance to dispatch the event through
 */
export const useAddDiagramWithBus = (eventBus: EventBus) => {
	return useCallback(
		(diagram: Diagram) => {
			const event: AddDiagramEvent = {
				eventId: newEventId(),
				item: diagram,
			};
			eventBus.dispatchEvent(
				new CustomEvent(ADD_NEW_DIAGRAM_EVENT_NAME, { detail: event }),
			);
		},
		[eventBus],
	);
};
