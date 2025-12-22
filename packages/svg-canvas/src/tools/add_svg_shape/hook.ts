
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import { createSvgState } from "../../utils/shapes/svg/createSvgState";

export const useAddSvgShapeTool = (eventBus: EventBus): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	return useCallback(
		(functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				x: number;
				y: number;
				svgText: string;
				width?: number;
				height?: number;
				rotation?: number;
				scaleX?: number;
				scaleY?: number;
				keepProportion?: boolean;
			};

			// Validate required parameters
			if (typeof args.x !== "number" || typeof args.y !== "number") {
				console.error("Invalid arguments: x and y must be numbers", args);
				return null;
			}

			if (typeof args.svgText !== "string" || args.svgText.trim() === "") {
				console.error(
					"Invalid svgText: must be a non-empty string",
					args.svgText,
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

			// Validate keepProportion
			if (
				args.keepProportion !== undefined &&
				typeof args.keepProportion !== "boolean"
			) {
				console.error(
					"Invalid keepProportion: must be a boolean",
					args.keepProportion,
				);
				return null;
			}

			const data = createSvgState({
				x: args.x,
				y: args.y,
				svgText: args.svgText,
				width: args.width,
				height: args.height,
				rotation: args.rotation,
				scaleX: args.scaleX,
				scaleY: args.scaleY,
				keepProportion: args.keepProportion,
			});

			addDiagram(data);

			return {
				id: data.id,
				type: "Svg",
				width: data.width,
				height: data.height,
				rotation: data.rotation,
				scaleX: data.scaleX,
				scaleY: data.scaleY,
				keepProportion: data.keepProportion,
			};
		},
		[addDiagram],
	);
};
