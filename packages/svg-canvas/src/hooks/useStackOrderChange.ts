import { useCallback } from "react";

import { STACK_ORDER_CHANGE_EVENT_NAME } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import type { StackOrderChangeEvent } from "../types/events/StackOrderChangeEvent";

/**
 * Hook for changing the stack order of diagrams via the event bus.
 * Dispatches StackOrderChangeEvent to the event bus.
 */
export const useStackOrderChange = () => {
	// Get EventBus instance from context
	const eventBus = useEventBus();

	// Function to dispatch stack order change events
	return useCallback(
		(event: StackOrderChangeEvent) => {
			// Dispatch the StackOrderChangeEvent to the EventBus
			eventBus.dispatchEvent(
				new CustomEvent(STACK_ORDER_CHANGE_EVENT_NAME, { detail: event }),
			);
		},
		[eventBus],
	);
};
