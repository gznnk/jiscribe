import type { CanvasAction } from "./CanvasActions";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../CanvasTypes";
import { handleCommand } from "../commands/handlers/handleCommand";
import { handleGesture } from "../gestures/handlers/handleGesture";
import { commitTextEditIfNeeded } from "../utils/commitTextEditIfNeeded";
import { recordHistoryIfNeeded } from "../utils/recordHistory";

export const canvasReducer = (
	state: CanvasControllerState,
	action: CanvasAction,
): CanvasControllerState => {
	switch (action.type) {
		case "GESTURE": {
			// handleGesture internally records history when lastCommitTime changes
			return handleGesture(state, action.gesture);
		}

		case "COMMAND": {
			// Handle all commands through handleCommand (including undo/redo)
			// handleCommand internally records history when needed
			return handleCommand(state, action.commandId);
		}

		case "CONTAINER_RESIZE": {
			return {
				...state,
				viewport: {
					...state.viewport,
					width: action.dimensions.width,
					height: action.dimensions.height,
				},
			};
		}

		case "SYNC_EXTERNAL": {
			// 外部更新を反映 + 履歴のpresentも更新
			const doc = canvasToDoc({
				...state,
				objects: action.payload.objects,
				rootIds: action.payload.rootIds,
				connectorIds: action.payload.connectorIds,
			});

			return {
				...state,
				objects: action.payload.objects,
				rootIds: action.payload.rootIds,
				connectorIds: action.payload.connectorIds,
				history: {
					...state.history,
					present: doc,
				},
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
				const commitResult = commitTextEditIfNeeded(state, Date.now());
				return recordHistoryIfNeeded(commitResult, state.lastCommitTime);
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
