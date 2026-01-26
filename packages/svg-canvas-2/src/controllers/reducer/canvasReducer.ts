import type { Dimensions } from "@workspace/geometry";

import type { CanvasState } from "../../states/canvas/CanvasState";
import { handleGesture } from "../gestures/handlers/handleGesture";
import type { Gesture } from "../gestures/recognizer/GestureRecognizerTypes";

// Action types
export type CanvasAction =
	| { type: "GESTURE"; gesture: Gesture }
	| { type: "CONTAINER_RESIZE"; dimensions: Dimensions }
	| { type: "SYNC_EXTERNAL"; payload: CanvasState }
	| {
			type: "CONTEXT_MENU";
			payload: { clientX: number; clientY: number } | null;
	  }
	| {
			type: "VIEWPORT_ZOOM";
			payload: {
				zoom: number;
				svgX: number;
				svgY: number;
			};
	  };

export const canvasReducer = (
	state: CanvasState,
	action: CanvasAction,
): CanvasState => {
	switch (action.type) {
		case "GESTURE": {
			return handleGesture(state, action.gesture);
		}

		case "CONTAINER_RESIZE":
			return {
				...state,
				viewport: {
					...state.viewport,
					width: action.dimensions.width,
					height: action.dimensions.height,
				},
			};

		case "SYNC_EXTERNAL": {
			// 外部更新を反映
			return {
				...state,
				objects: action.payload.objects,
				rootIds: action.payload.rootIds,
				connectorIds: action.payload.connectorIds,
			};
		}

		case "CONTEXT_MENU":
			return {
				...state,
				contextMenuPosition: action.payload,
			};

		case "VIEWPORT_ZOOM": {
			const { svgX, svgY } = action.payload;
			const { minX, minY, width, height, zoom } = state.viewport;
			const currentViewBoxWidth = width / zoom;
			const currentViewBoxHeight = height / zoom;
			const newViewBoxWidth = width / action.payload.zoom;
			const newViewBoxHeight = height / action.payload.zoom;
			const offsetX = (svgX - minX) / currentViewBoxWidth;
			const offsetY = (svgY - minY) / currentViewBoxHeight;
			const newMinX = svgX - newViewBoxWidth * offsetX;
			const newMinY = svgY - newViewBoxHeight * offsetY;
			return {
				...state,
				viewport: {
					...state.viewport,
					zoom: action.payload.zoom,
					minX: newMinX,
					minY: newMinY,
				},
			};
		}

		default:
			return state;
	}
};
