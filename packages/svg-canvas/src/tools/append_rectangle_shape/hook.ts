import type { EventBus } from "@workspace/event-bus";
import { isRect } from "@workspace/geometry";
import type { FunctionCallHandler } from "@workspace/llm-client";
import { useCallback } from "react";

import { useAppendDiagramsWithBus } from "../../hooks/useAppendDiagramsWithBus";
import { useAddRectangleShapeWithHandlerTool } from "../add_rectangle_shape_with_handler";

export const useAppendRectangleShapeTool = (
	eventBus: EventBus,
): ((
	targetId: string,
	offsetX?: number,
	offsetY?: number,
) => FunctionCallHandler) => {
	const appendDiagrams = useAppendDiagramsWithBus(eventBus);
	const rectangleShapeWithHandlerTool = useAddRectangleShapeWithHandlerTool();

	return useCallback(
		(targetId: string, offsetX = 0, offsetY = 0) => {
			return rectangleShapeWithHandlerTool((diagram) => {
				if (!isRect(diagram)) {
					console.error("Diagram is not a rectangle shape. Cannot append.");
					return;
				}
				// Apply offset to the diagram
				const offsetDiagram = {
					...diagram,
					x: diagram.x + offsetX,
					y: diagram.y + offsetY,
				};
				appendDiagrams(targetId, [offsetDiagram]);
			});
		},
		[appendDiagrams, rectangleShapeWithHandlerTool],
	);
};
