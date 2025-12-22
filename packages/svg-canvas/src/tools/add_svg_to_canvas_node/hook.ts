
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import { createSvgToDiagramNodeState } from "../../utils/nodes/svgToDiagramNode/createSvgToDiagramNodeState";

export const useAddSvgToCanvasNodeTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	return useCallback(
		(functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as { x: number; y: number };
			if (typeof args.x === "number" && typeof args.y === "number") {
				const data = createSvgToDiagramNodeState({ x: args.x, y: args.y });
				addDiagram(data);
				return {
					id: data.id,
					type: "SvgToDiagramNode",
					width: data.width,
					height: data.height,
				};
			}
			return null;
		},
		[addDiagram],
	);
};
