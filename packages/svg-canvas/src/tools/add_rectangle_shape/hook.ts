
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler } from "@workspace/llm-client";
import { useMemo } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import { useAddRectangleShapeWithHandlerTool } from "../add_rectangle_shape_with_handler";

export const useAddRectangleShapeTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	const rectangleShapeWithHandlerTool = useAddRectangleShapeWithHandlerTool();

	return useMemo(
		() => rectangleShapeWithHandlerTool(addDiagram),
		[addDiagram, rectangleShapeWithHandlerTool],
	);
};
