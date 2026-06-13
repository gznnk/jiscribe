import type { CanvasAction } from "./CanvasActions";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
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
			return recordHistoryIfNeeded(gestureResult, state.commitVersion);
		}

		case "COMMAND": {
			const commandResult = handleCommand(state, action.commandId);
			return recordHistoryIfNeeded(commandResult, state.commitVersion);
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
			// ObjectMenu からのプロパティ更新には2経路ある。
			// (1) このケース: number-input など React の onChange イベント経由で Canvas.tsx の onPropertyUpdate コールバックから dispatch される
			// (2) ObjectMenuHandler: gesture システム経由（set: / slider:）。こちらはここを通らない
			const updated = handlePropertyUpdate(
				state,
				action.property,
				action.value,
			);
			// プロパティ変更後は頂点選択を解除する（Delete キーがオブジェクト削除として機能するように）
			const updatedWithVertexCleared = { ...updated, selectedVertex: null };
			if (!action.commit) {
				return updatedWithVertexCleared;
			}
			return recordHistoryIfNeeded(
				{ ...updatedWithVertexCleared, commitVersion: state.commitVersion + 1 },
				state.commitVersion,
			);
		}

		case "SYNC_EXTERNAL": {
			const newDoc = canvasToDoc({
				...state,
				objects: action.payload.objects,
				rootIds: action.payload.rootIds,
				connectorIds: action.payload.connectorIds,
			});

			// 自己保存の折り返し: action.saveNonce が state.saveNonce と一致する場合、
			// この SYNC_EXTERNAL は自分が送ったデータがエコーバックされたものなので
			// オブジェクト参照だけ更新し、past/future（history）は変更しない。
			if (
				action.saveNonce !== undefined &&
				action.saveNonce === state.saveNonce
			) {
				return {
					...state,
					objects: action.payload.objects,
					rootIds: action.payload.rootIds,
					connectorIds: action.payload.connectorIds,
				};
			}

			// 外部からの本物の変更: 現在の present を past に記録してから present を更新する。
			// future はクリア（外部変更後に古い状態へ redo されるのを防ぐ）。
			// オブジェクトが差し替わるため、選択状態・進行中の操作など全ての UI state もクリアする。
			// viewport のみ維持（ユーザーの現在の視点を保持するため）。
			return {
				...state,
				objects: action.payload.objects,
				rootIds: action.payload.rootIds,
				connectorIds: action.payload.connectorIds,
				selectedIds: [],
				selectedConnectorId: null,
				eventStartSnapshot: null,
				keyPointsCache: {},
				snapCandidatesCache: null,
				edgeScrollEnabled: false,
				textEditState: null,
				pendingConnector: null,
				editingConnectorId: null,
				editingEndpoint: null,
				contextMenuPosition: null,
				areaSelection: null,
				multiSelectGroup: null,
				selectedVertex: null,
				shapeDrawing: null,
				shapeLibraryDrag: null,
				snapFeedback: null,
				objectMenuOpenId: null,
				history: {
					past: [...state.history.past, state.history.present].slice(-50),
					present: newDoc,
					future: [],
				},
			};
		}

		case "UPDATE_TEXT_EDIT": {
			if (!state.textEditState) {
				return state;
			}
			return {
				...state,
				textEditState: {
					...state.textEditState,
					text: action.text,
				},
			};
		}

		case "END_TEXT_EDIT": {
			if (!state.textEditState) {
				return state;
			}

			if (action.commit) {
				const commitResult = commitTextEditIfNeeded(state);
				return recordHistoryIfNeeded(commitResult, state.commitVersion);
			}

			// キャンセルの場合は textEditState のみクリア
			return {
				...state,
				textEditState: null,
			};
		}

		case "PASTE": {
			const pasteResult = handlePaste(state, action.data);
			return recordHistoryIfNeeded(pasteResult, state.commitVersion);
		}

		case "CLOSE_CONTEXT_MENU": {
			if (state.contextMenuPosition === null) {
				return state;
			}
			return { ...state, contextMenuPosition: null };
		}

		default:
			return state;
	}
};

/**
 * commitVersion が変化していれば履歴を記録し、saveVersion もインクリメントする。
 * canvasReducer のみが呼び出してよい。
 */
const recordHistoryIfNeeded = (
	state: CanvasControllerState,
	previousCommitVersion: number,
): CanvasControllerState => {
	if (
		state.commitVersion > 0 &&
		state.commitVersion !== previousCommitVersion
	) {
		const doc = canvasToDoc(state);
		const newPast = [...state.history.past, state.history.present].slice(-50);
		return {
			...state,
			saveVersion: state.saveVersion + 1,
			saveNonce: crypto.randomUUID(),
			history: {
				past: newPast,
				present: doc,
				future: [],
			},
		};
	}
	return state;
};
