import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler } from "@workspace/llm-client";
import { useCallback } from "react";

import { useAppendDiagramsWithBus } from "../../hooks/useAppendDiagramsWithBus";
import { useAddTextElementWithHandlerTool } from "../add_text_element_with_handler";

export const useAppendTextElementTool = (
	eventBus: EventBus,
): ((
	targetId: string,
	offsetX?: number,
	offsetY?: number,
) => FunctionCallHandler) => {
	const appendDiagrams = useAppendDiagramsWithBus(eventBus);
	const textElementWithHandlerTool = useAddTextElementWithHandlerTool();

	return useCallback(
		(targetId: string, offsetX = 0, offsetY = 0) => {
			return textElementWithHandlerTool((diagram) => {
				// TODO: 要修正
				// Apply offset to the diagram
				const offsetDiagram = {
					...diagram,
					x: (diagram as unknown as { x: number }).x + offsetX,
					y: (diagram as unknown as { y: number }).y + offsetY,
				};
				appendDiagrams(targetId, [offsetDiagram]);
			});
		},
		[appendDiagrams, textElementWithHandlerTool],
	);
};
