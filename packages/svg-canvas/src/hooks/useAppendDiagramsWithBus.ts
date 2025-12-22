import type { EventBus } from "@workspace/event-bus";
import { useCallback } from "react";

import { APPEND_DIAGRAMS_EVENT_NAME } from "../constants/core/EventNames";
import type { AppendDiagramsEvent } from "../types/events/AppendDiagramsEvent";
import type { Diagram } from "../types/state/core/Diagram";
import { newEventId } from "../utils/core/newEventId";

/**
 * Returns a callback for tool modules to dispatch an AppendDiagramsEvent using the provided eventBus.
 * @param eventBus - The EventBus instance to dispatch the event through
 */
export const useAppendDiagramsWithBus = (eventBus: EventBus) => {
	return useCallback(
		(targetId: string, diagrams: Diagram[]) => {
			const event: AppendDiagramsEvent = {
				eventId: newEventId(),
				targetId,
				diagrams,
			};
			eventBus.dispatchEvent(
				new CustomEvent(APPEND_DIAGRAMS_EVENT_NAME, { detail: event }),
			);
		},
		[eventBus],
	);
};
