import type { EventBus } from "@workspace/event-bus";
import { createContext, useContext, type ReactNode } from "react";

/**
 * EventBus context for SvgCanvas components
 */
const EventBusContext = createContext<EventBus | null>(null);

/**
 * Props for EventBusProvider
 */
type EventBusProviderProps = {
	eventBus: EventBus;
	children: ReactNode;
};

/**
 * Provider component for EventBus context
 */
export const EventBusProvider = ({
	eventBus,
	children,
}: EventBusProviderProps) => {
	return (
		<EventBusContext.Provider value={eventBus}>
			{children}
		</EventBusContext.Provider>
	);
};

/**
 * Hook to access EventBus from context
 * @returns EventBus instance
 * @throws Error if used outside of EventBusProvider
 */
export const useEventBus = (): EventBus => {
	const eventBus = useContext(EventBusContext);

	if (!eventBus) {
		throw new Error("useEventBus must be used within an EventBusProvider");
	}

	return eventBus;
};
