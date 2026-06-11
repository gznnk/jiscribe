import { type Dispatch, useEffect, useRef } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { isSameCanvasDocContent } from "../utils/isSameCanvasDocContent";

export type UseSyncExternalDocParams = {
	/** 親から渡される最新の CanvasDoc */
	canvasDoc: CanvasDoc;
	/** 直近の同期メッセージの nonce（fold-back 保存の検出に使う） */
	syncNonce: string | undefined;
	/** Canvas の現在 state（内容比較に使う） */
	canvasState: CanvasControllerState;
	/** Canvas reducer の dispatch */
	dispatch: Dispatch<CanvasAction>;
	/** 同期前に進行中のジェスチャーを破棄するコールバック */
	resetGestureState: () => void;
};

/**
 * 外部からの canvasDoc 変更を Canvas state へ同期するカスタムフック
 *
 * マウント直後の初回は reducer の初期化で同じ canvasDoc を使用済みのためスキップする
 * （SYNC_EXTERNAL を dispatch すると冗長な履歴エントリが生まれてしまう）。
 */
export const useSyncExternalDoc = ({
	canvasDoc,
	syncNonce,
	canvasState,
	dispatch,
	resetGestureState,
}: UseSyncExternalDocParams): void => {
	const hasMountedRef = useRef(false);

	// Always-fresh mirror of state so the sync effect below does not need to
	// depend on (and re-run for) every state change.
	const stateRef = useRef(canvasState);
	useEffect(() => {
		stateRef.current = canvasState;
	});

	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}
		// Content-identical doc (e.g. the parent re-created the object, or our own
		// save echoed back): skip entirely. Proceeding would interrupt an
		// in-progress gesture, clear all UI state, and push a redundant history
		// entry even though nothing changed.
		if (isSameCanvasDocContent(canvasDoc, stateRef.current.history.present)) {
			return;
		}
		const newState = canvasToState(canvasDoc);
		resetGestureState();
		dispatch({
			type: "SYNC_EXTERNAL",
			payload: newState,
			saveNonce: syncNonce,
		});
	}, [canvasDoc, dispatch, resetGestureState, syncNonce]);
};
