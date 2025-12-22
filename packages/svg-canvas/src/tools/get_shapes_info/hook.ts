
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useCallback } from "react";

import { useSvgCanvasState } from "../../context/SvgCanvasStateContext";
import type { DiagramBaseState } from "../../types/state/core/DiagramBaseState";

/**
 * Type for the shape information returned by the tool
 */
type ShapeInfo = {
	id: string;
	x: number; // Center X coordinate
	y: number; // Center Y coordinate
	width: number;
	height: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	name?: string;
	description?: string;
};

/**
 * Hook that provides a function call handler for retrieving shape information from the canvas.
 * Returns information about all shapes in the first level of the canvas items.
 *
 * @param _eventBus - Event bus instance (unused but required for handler signature)
 * @returns Function call handler that retrieves shape information
 */
export const useGetShapesInfoTool = (
	_eventBus: EventBus,
): FunctionCallHandler => {
	const canvasStateRef = useSvgCanvasState();

	return useCallback(
		(_functionCall: FunctionCallInfo) => {
			const canvasState = canvasStateRef.current;
			if (!canvasState) {
				return { shapes: [] };
			}

			// Get all first-level items from the canvas
			const firstLevelItems = canvasState.items;

			// Map to shape information objects
			const results: ShapeInfo[] = firstLevelItems.map((item) => {
				const diagramState = item as DiagramBaseState & {
					width?: number;
					height?: number;
					rotation?: number;
					scaleX?: number;
					scaleY?: number;
				};

				const shapeInfo: ShapeInfo = {
					id: diagramState.id,
					x: diagramState.x,
					y: diagramState.y,
					width: diagramState.width || 0,
					height: diagramState.height || 0,
				};

				// Add optional transformation properties if they exist
				if (diagramState.rotation !== undefined) {
					shapeInfo.rotation = diagramState.rotation;
				}
				if (diagramState.scaleX !== undefined) {
					shapeInfo.scaleX = diagramState.scaleX;
				}
				if (diagramState.scaleY !== undefined) {
					shapeInfo.scaleY = diagramState.scaleY;
				}

				// Add optional name and description if they exist
				if (diagramState.name) {
					shapeInfo.name = diagramState.name;
				}
				if (diagramState.description) {
					shapeInfo.description = diagramState.description;
				}

				return shapeInfo;
			});

			return { shapes: results };
		},
		[canvasStateRef],
	);
};
