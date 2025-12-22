
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler } from "@workspace/llm-client";
import { useCallback, useMemo } from "react";

import { EVENT_NAME_GROUP_SHAPES } from "../../constants/core/EventNames";
import type { GroupShapesEvent } from "../../types/events/GroupShapesEvent";
import { newEventId } from "../../utils/core/newEventId";
import { useGroupShapesWithHandlerTool } from "../group_shapes_with_handler";

/**
 * React hook to dispatch GroupShapesEvent using the shared event bus.
 * Returns a memoized function.
 */
export const useGroupShapesTool = (eventBus: EventBus): FunctionCallHandler => {
	const groupShapesWithHandlerTool = useGroupShapesWithHandlerTool();

	const handler = useCallback(
		(result: {
			shapeIds: string[];
			groupId: string;
			name?: string;
			description?: string;
		}) => {
			const event: GroupShapesEvent = {
				eventId: newEventId(),
				shapeIds: result.shapeIds,
				groupId: result.groupId,
				name: result.name,
				description: result.description,
			};

			const customEvent = new CustomEvent(EVENT_NAME_GROUP_SHAPES, {
				detail: event,
			});
			eventBus.dispatchEvent(customEvent);
		},
		[eventBus],
	);

	return useMemo(
		() => groupShapesWithHandlerTool(handler),
		[groupShapesWithHandlerTool, handler],
	);
};
