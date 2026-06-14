import { type Dispatch, useReducer } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToDoc, canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { canvasReducer } from "../reducer/canvasReducer";

const createInitialControllerState = (
	initialDoc: CanvasDoc,
): CanvasControllerState => {
	const baseState = canvasToState(initialDoc);
	return {
		...baseState,
		selectedIds: [],
		eventStartSnapshot: null,
		keyPointsCache: {},
		snapCandidatesCache: null,
		edgeScrollEnabled: false,
		commitVersion: 0,
		saveVersion: 0,
		saveNonce: "",
		historyCoalesce: { recorded: null, pending: null },
		contextMenuPosition: null,
		shapeLibraryDrag: null,
		areaSelection: null,
		objectMenuOpenId: null,
		multiSelectGroup: null,
		textEditState: null,
		pendingConnector: null,
		selectedConnectorId: null,
		selectedVertex: null,
		editingConnectorId: null,
		editingEndpoint: null,
		snapFeedback: null,
		shapeDrawing: null,
		lastDuplicate: null,
		internalClipboard: null,
		history: {
			past: [],
			present: canvasToDoc(baseState),
			future: [],
		},
	};
};

/**
 * Canvas の状態管理用 reducer を初期 state の構築込みでセットアップするカスタムフック
 *
 * @param canvasDoc - 初期 state の構築に使う CanvasDoc（マウント時のみ参照される）
 */
export const useCanvasReducer = (
	canvasDoc: CanvasDoc,
): [CanvasControllerState, Dispatch<CanvasAction>] => {
	return useReducer(canvasReducer, canvasDoc, createInitialControllerState);
};
