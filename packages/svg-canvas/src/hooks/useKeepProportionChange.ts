import { useCallback } from "react";

import { KEEP_PROPORTION_CHANGE_EVENT_NAME } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import type { DiagramKeepProportionChangeEvent } from "../types/events/DiagramKeepProportionChangeEvent";

/**
 * Hook that returns a function to dispatch keep proportion change events via the event bus.
 * This allows components to trigger keepProportion changes without direct coupling.
 */
export const useKeepProportionChange = () => {
	const eventBus = useEventBus();

	return useCallback(
		(event: DiagramKeepProportionChangeEvent) => {
			eventBus.dispatchEvent(
				new CustomEvent(KEEP_PROPORTION_CHANGE_EVENT_NAME, { detail: event }),
			);
		},
		[eventBus],
	);
};
