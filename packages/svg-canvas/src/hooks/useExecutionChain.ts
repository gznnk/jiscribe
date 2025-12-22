import { useEffect, useRef } from "react";

import { EVENT_NAME_EXECUTION_PROPAGATION } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import type { ExecutionPropagationEvent } from "../types/events/ExecutionPropagationEvent";

type ExecutionChainProps = {
	id: string;
	onPropagation: (e: ExecutionPropagationEvent) => void;
};

export const useExecutionChain = (props: ExecutionChainProps) => {
	// Get EventBus instance from context
	const eventBus = useEventBus();

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		...props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	useEffect(() => {
		const handlePropagation = (e: CustomEvent) => {
			const customEvent = e as CustomEvent<ExecutionPropagationEvent>;
			// If the event is triggered by itself, do nothing.
			if (customEvent.detail.id === refBus.current.id) return;

			// If this event is targeting the parent component, invoke its onPropagation callback.
			const targetId = customEvent.detail.targetId;
			if (targetId.includes(refBus.current.id)) {
				// Call the onPropagation function passed from the parent component.
				refBus.current.onPropagation(customEvent.detail);
			}
		};

		// Add the event listener to the EventBus instead of document.
		eventBus.addEventListener(
			EVENT_NAME_EXECUTION_PROPAGATION,
			handlePropagation,
		);

		return () => {
			// Remove the event listener from the EventBus instead of document.
			eventBus.removeEventListener(
				EVENT_NAME_EXECUTION_PROPAGATION,
				handlePropagation,
			);
		};
	}, [eventBus]);
};
