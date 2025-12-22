import { useCallback } from "react";

import { useDiagramUpdate } from "./useDiagramUpdate";
import type {
	DiagramUpdateData,
	DiagramUpdateEvent,
} from "../types/events/DiagramUpdateEvent";
import type { Diagram } from "../types/state/core/Diagram";
import { newEventId } from "../utils/core/newEventId";
import { isItemableState } from "../utils/validation/isItemableState";

export type ApplyDiagramUpdateRecursivelyParams<T = unknown> = {
	items: Diagram[];
	data: DiagramUpdateData<T>;
	eventId?: string;
	skipHistory?: boolean;
};

/**
 * Hook for applying diagram updates recursively to diagrams and their children via the event bus.
 * Dispatches DiagramUpdateEvent to the event bus for each item and recursively updates nested items.
 * This is useful for updating styles or properties across a tree of diagrams.
 */
export const useDiagramUpdateRecursively = () => {
	const diagramUpdate = useDiagramUpdate();

	const applyDiagramUpdateRecursively = useCallback(
		<T = unknown>(params: ApplyDiagramUpdateRecursivelyParams<T>) => {
			const { items, data, eventId = newEventId(), skipHistory } = params;

			for (const item of items) {
				const event: DiagramUpdateEvent<T> = {
					eventId,
					id: item.id,
					data,
					skipHistory,
				};

				// Dispatch the DiagramUpdateEvent to the EventBus
				diagramUpdate(event);

				// Recursively update nested items if this is an itemable
				if (isItemableState(item)) {
					applyDiagramUpdateRecursively({
						items: item.items,
						data,
						eventId,
						skipHistory,
					});
				}
			}
		},
		[diagramUpdate],
	);

	return applyDiagramUpdateRecursively;
};
