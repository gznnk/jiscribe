
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler } from "@workspace/llm-client";
import { useMemo } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import { useAddTextElementWithHandlerTool } from "../add_text_element_with_handler";

export const useAddTextElementTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	const textElementWithHandlerTool = useAddTextElementWithHandlerTool();

	return useMemo(
		() => textElementWithHandlerTool(addDiagram),
		[addDiagram, textElementWithHandlerTool],
	);
};
