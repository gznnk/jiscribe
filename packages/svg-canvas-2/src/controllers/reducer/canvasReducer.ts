import type { CanvasAction } from "./CanvasActions";
import type { CanvasState } from "../../states/canvas/CanvasState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import { handleCommand } from "../commands/handlers/handleCommand";
import { handleGesture } from "../gestures/handlers/handleGesture";
import { commitTextEdit } from "../utils/commitTextEdit";

export const canvasReducer = (
	state: CanvasState,
	action: CanvasAction,
): CanvasState => {
	switch (action.type) {
		case "GESTURE": {
			return handleGesture(state, action.gesture);
		}

		case "COMMAND": {
			return handleCommand(state, action.commandId);
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

		case "START_TEXT_EDIT": {
			const targetObject = state.objects[action.objectId];
			if (!targetObject || !isTextStyleState(targetObject)) {
				return state;
			}
			return {
				...state,
				textEditState: {
					objectId: action.objectId,
					text: targetObject.text ?? "",
				},
			};
		}

		case "UPDATE_TEXT_EDIT": {
			if (!state.textEditState) return state;
			return {
				...state,
				textEditState: {
					...state.textEditState,
					text: action.text,
				},
			};
		}

		case "END_TEXT_EDIT": {
			if (!state.textEditState) return state;

			if (action.commit) {
				// commitTextEdit を使用してテキストを確定
				return commitTextEdit(state, Date.now());
			}

			// キャンセルの場合は textEditState のみクリア
			return {
				...state,
				textEditState: null,
			};
		}

		default:
			return state;
	}
};
