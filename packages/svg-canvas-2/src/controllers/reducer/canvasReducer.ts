import type { CanvasAction } from "./CanvasActions";
import type { CanvasState } from "../../states/canvas/CanvasState";
import { handleGesture } from "../gestures/handlers/handleGesture";

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
