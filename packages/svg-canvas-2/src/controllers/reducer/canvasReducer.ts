import type { Dimensions } from "@workspace/geometry";

import type { Gesture, GestureType } from "./../hooks/useGestureRecognizer";
import { handleGesture } from "./handleGesture";
import type { CanvasState } from "../../states/canvas/CanvasState";

/**
 * Check if a gesture type should trigger a commit to parent component.
 * Committable gestures are: dragEnd (after drag operation) and click (selection change).
 */
const isCommittableGesture = (gestureType: GestureType): boolean => {
	return gestureType === "dragEnd" || gestureType === "click";
};

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
		case "GESTURE": {
			const newState = handleGesture(state, action.gesture);

			// Increment commitId for committable gestures (dragEnd, click)
			if (isCommittableGesture(action.gesture.type)) {
				return { ...newState, commitId: state.commitId + 1 };
			}

			return newState;
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

		default:
			return state;
	}
};
