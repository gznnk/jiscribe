
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { useSvgCanvasState } from "../../context/SvgCanvasStateContext";
import type { StickyState } from "../../types/state/diagrams/StickyState";
import { getDiagramsByType } from "../../utils/core/getDiagramsByType";

/**
 * Type for the simplified sticky note data returned by the tool
 */
type StickyResult = {
	id: string;
	text: string;
};

export const useGetStickiesTool = (
	_eventBus: EventBus,
): FunctionCallHandler => {
	const canvasStateRef = useSvgCanvasState();

	return useCallback(
		(_functionCall: FunctionCallInfo) => {
			const canvasState = canvasStateRef.current;
			if (!canvasState) {
				return { stickies: [] };
			}

			// Get all sticky diagrams from the canvas
			const stickyDiagrams = getDiagramsByType(canvasState.items, "Sticky");

			// Map to simplified objects with id and text only
			const results: StickyResult[] = stickyDiagrams.map((sticky) => {
				const stickyState = sticky as StickyState;
				return {
					id: stickyState.id,
					text: stickyState.text || "",
				};
			});

			return { stickies: results };
		},
		[canvasStateRef],
	);
};
