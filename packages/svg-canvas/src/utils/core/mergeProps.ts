type EventHandler = (...args: unknown[]) => void;

/**
 * Merges multiple props objects into a single props object.
 * Later props objects will override properties from earlier ones.
 * Event handlers are composed by calling all handlers in order.
 *
 * @param propsList - Variable number of props objects to merge
 * @returns Merged props object with composed event handlers
 */
export const mergeProps = <T = Record<string, unknown>>(
	...propsList: Array<Record<string, unknown> | undefined>
): T => {
	const mergedProps = {} as Record<string, unknown>;
	const eventHandlers: Record<string, EventHandler[]> = {};

	// Process each props object
	for (const props of propsList) {
		if (!props) continue;

		for (const [key, value] of Object.entries(props)) {
			// Check if this is an event handler (starts with 'on' and is a function)
			if (key.startsWith("on") && typeof value === "function") {
				if (!eventHandlers[key]) {
					eventHandlers[key] = [];
				}
				eventHandlers[key].push(value as EventHandler);
			} else {
				// For non-event handler properties, later values override earlier ones
				mergedProps[key] = value;
			}
		}
	}

	// Compose event handlers
	for (const [eventName, handlers] of Object.entries(eventHandlers)) {
		if (handlers.length === 1) {
			// Single handler, use directly
			mergedProps[eventName] = handlers[0];
		} else if (handlers.length > 1) {
			// Multiple handlers, compose them
			mergedProps[eventName] = (...args: unknown[]) => {
				for (const handler of handlers) {
					handler(...args);
				}
			};
		}
	}

	return mergedProps as T;
};
