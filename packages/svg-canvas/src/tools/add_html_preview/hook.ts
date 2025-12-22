
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import { createHtmlPreviewState } from "../../utils/shapes/htmlPreview/createHtmlPreviewState";

export const useAddHtmlPreviewTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	return useCallback(
		(functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				x: number;
				y: number;
				htmlContent: string;
				width?: number;
				height?: number;
				rotation?: number;
				scaleX?: number;
				scaleY?: number;
			};

			// Validate required parameters
			if (typeof args.x !== "number" || typeof args.y !== "number") {
				console.error("Invalid arguments: x and y must be numbers", args);
				return null;
			}

			if (
				typeof args.htmlContent !== "string" ||
				args.htmlContent.trim() === ""
			) {
				console.error(
					"Invalid htmlContent: must be a non-empty string",
					args.htmlContent,
				);
				return null;
			}

			// Validate optional numeric parameters
			if (args.width !== undefined && typeof args.width !== "number") {
				console.error("Invalid width: must be a number", args.width);
				return null;
			}

			if (args.height !== undefined && typeof args.height !== "number") {
				console.error("Invalid height: must be a number", args.height);
				return null;
			}

			if (args.rotation !== undefined && typeof args.rotation !== "number") {
				console.error("Invalid rotation: must be a number", args.rotation);
				return null;
			}

			if (args.scaleX !== undefined && typeof args.scaleX !== "number") {
				console.error("Invalid scaleX: must be a number", args.scaleX);
				return null;
			}

			if (args.scaleY !== undefined && typeof args.scaleY !== "number") {
				console.error("Invalid scaleY: must be a number", args.scaleY);
				return null;
			}

			const data = createHtmlPreviewState({
				x: args.x,
				y: args.y,
			});

			// Apply htmlContent and optional parameters
			data.htmlContent = args.htmlContent;
			if (args.width !== undefined) data.width = args.width;
			if (args.height !== undefined) data.height = args.height;
			if (args.rotation !== undefined) data.rotation = args.rotation;
			if (args.scaleX !== undefined) data.scaleX = args.scaleX;
			if (args.scaleY !== undefined) data.scaleY = args.scaleY;

			addDiagram(data);

			return {
				id: data.id,
				type: "HtmlPreview",
				width: data.width,
				height: data.height,
				rotation: data.rotation,
				scaleX: data.scaleX,
				scaleY: data.scaleY,
			};
		},
		[addDiagram],
	);
};
