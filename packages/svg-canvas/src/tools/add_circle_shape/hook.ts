
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler } from "@workspace/llm-client";
import { useMemo } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import { useAddCircleShapeWithHandlerTool } from "../add_circle_shape_with_handler";

export const useAddCircleShapeTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	const circleShapeWithHandlerTool = useAddCircleShapeWithHandlerTool();

	return useMemo(
		() => circleShapeWithHandlerTool(addDiagram),
		[addDiagram, circleShapeWithHandlerTool],
	);
};
