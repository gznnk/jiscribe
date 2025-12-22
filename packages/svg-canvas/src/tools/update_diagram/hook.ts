
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { useDiagramUpdateWithBus } from "../../hooks/useDiagramUpdateWithBus";
import { newEventId } from "../../utils/core/newEventId";

/**
 * React hook to provide a handler for updating a diagram on the canvas using the event bus.
 * Returns a memoized FunctionCallHandler.
 *
 * @param eventBus - EventBus instance to use for dispatching events
 * @returns FunctionCallHandler for updating a diagram
 */
export const useUpdateDiagramTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const dispatchDiagramUpdate = useDiagramUpdateWithBus(eventBus);

	return useCallback(
		(functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				id: string;
				data: string;
			};

			// Validate that id is provided
			if (typeof args.id !== "string") {
				return {
					success: false,
					error: "Diagram ID is required",
				};
			}

			// Validate that data is provided and is a string
			if (!args.data || typeof args.data !== "string") {
				return {
					success: false,
					error: "Data JSON string is required",
				};
			}

			// Parse JSON string
			let parsedData: Record<string, unknown>;
			try {
				parsedData = JSON.parse(args.data) as Record<string, unknown>;
			} catch (error) {
				return {
					success: false,
					error: `Invalid JSON string: ${error instanceof Error ? error.message : "Failed to parse JSON"}`,
				};
			}

			// Check if at least one property is being updated
			if (Object.keys(parsedData).length === 0) {
				return {
					success: false,
					error: "Data object must contain at least one property to update",
				};
			}

			// Dispatch the update event
			dispatchDiagramUpdate({
				eventId: newEventId(),
				id: args.id,
				data: parsedData,
			});

			return {
				success: true,
				id: args.id,
				updated: parsedData,
			};
		},
		[dispatchDiagramUpdate],
	);
};
