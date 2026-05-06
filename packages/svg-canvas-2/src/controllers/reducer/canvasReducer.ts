import type { CanvasAction } from "./CanvasActions";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../CanvasTypes";
import { handlePaste } from "./handlers/handlePaste";
import { handleCommand } from "../commands/handlers/handleCommand";
import { handleGesture } from "../gestures/handlers/handleGesture";
import { commitTextEditIfNeeded } from "../utils/commitTextEditIfNeeded";
import { handlePropertyUpdate } from "../utils/handlePropertyUpdate";

export const canvasReducer = (
	state: CanvasControllerState,
	action: CanvasAction,
): CanvasControllerState => {
	switch (action.type) {
		case "GESTURE": {
			const gestureResult = handleGesture(state, action.gesture);
			return recordHistoryIfNeeded(gestureResult, state.lastCommitTime);
		}

		case "COMMAND": {
			const commandResult = handleCommand(state, action.commandId);
			return recordHistoryIfNeeded(commandResult, state.lastCommitTime);
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

		case "MENU_PROPERTY_UPDATE": {
			const updated = handlePropertyUpdate(
				state,
				action.property,
				action.value,
			);
			if (!action.commit) return updated;
			return recordHistoryIfNeeded(
				{ ...updated, lastCommitTime: Date.now() },
				state.lastCommitTime,
			);
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
				const commitResult = commitTextEditIfNeeded(state, Date.now());
				return recordHistoryIfNeeded(commitResult, state.lastCommitTime);
			}

			// キャンセルの場合は textEditState のみクリア
			return {
				...state,
				textEditState: null,
			};
		}

		case "PASTE": {
			const pasteResult = handlePaste(state, action.data);
			return recordHistoryIfNeeded(pasteResult, state.lastCommitTime);
		}

		default:
			return state;
	}
};

/**
 * lastCommitTime が変化していれば履歴を記録する。
 * canvasReducer のみが呼び出してよい。
 */
const recordHistoryIfNeeded = (
	state: CanvasControllerState,
	previousLastCommitTime: number,
): CanvasControllerState => {
	if (
		state.lastCommitTime > 0 &&
		state.lastCommitTime !== previousLastCommitTime
	) {
		const doc = canvasToDoc(state);
		const newPast = [...state.history.past, state.history.present].slice(-50);
		return {
			...state,
			history: {
				past: newPast,
				present: doc,
				future: [],
			},
		};
	}
	return state;
};
