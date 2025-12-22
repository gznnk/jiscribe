
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler } from "@workspace/llm-client";
import { useMemo } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import { useAddMarkdownShapeWithHandlerTool } from "../add_markdown_shape_with_handler";

export const useAddMarkdownShapeTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	const markdownShapeWithHandlerTool = useAddMarkdownShapeWithHandlerTool();

	return useMemo(
		() => markdownShapeWithHandlerTool(addDiagram),
		[addDiagram, markdownShapeWithHandlerTool],
	);
};
