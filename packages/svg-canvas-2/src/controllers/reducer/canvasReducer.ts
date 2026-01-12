import type { Dimensions } from "@workspace/geometry";

import { handleGesture } from "./../gestures";
import type { Gesture } from "./../hooks/useGestureRecognizer";
import type { CanvasState } from "../../states/canvas/CanvasState";

// Action types
export type CanvasAction =
	| { type: "GESTURE"; gesture: Gesture }
	| { type: "CONTAINER_RESIZE"; dimensions: Dimensions }
	| { type: "SYNC_EXTERNAL"; payload: CanvasState };

export const canvasReducer = (
	state: CanvasState,
	action: CanvasAction,
): CanvasState => {
	switch (action.type) {
		case "GESTURE":
			return handleGesture(state, action.gesture);

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

		default:
			return state;
	}
};
