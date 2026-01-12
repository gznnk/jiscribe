import { handleGesture } from "./gestures";
import type { Gesture } from "./useGestureRecognizer";
import type { CanvasState } from "../states/canvas/CanvasState";

// Action types
export type CanvasAction =
	| { type: "GESTURE"; gesture: Gesture }
	| { type: "SYNC_EXTERNAL"; payload: CanvasState };

export const canvasReducer = (
	state: CanvasState,
	action: CanvasAction,
): CanvasState => {
	switch (action.type) {
		case "GESTURE":
			return handleGesture(state, action.gesture);

		case "SYNC_EXTERNAL":
			// 外部更新を反映（選択状態とドラッグ状態は保持）
			return {
				...action.payload,
				selectedIds: state.selectedIds,
				dragging: state.dragging,
			};

		default:
			return state;
	}
};
