import type { Dimensions } from "@workspace/geometry";

import type { Gesture } from "./../hooks/useGestureRecognizer";
import type { CanvasState } from "../../states/canvas/CanvasState";
import { handleGesture } from "../gestures/handlers/handleGesture";

// Action types
export type CanvasAction =
	| { type: "GESTURE"; gesture: Gesture }
	| { type: "CONTAINER_RESIZE"; dimensions: Dimensions }
	| { type: "SYNC_EXTERNAL"; payload: CanvasState }
	| {
			type: "CONTEXT_MENU";
			payload: { clientX: number; clientY: number } | null;
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

		default:
			return state;
	}
};
