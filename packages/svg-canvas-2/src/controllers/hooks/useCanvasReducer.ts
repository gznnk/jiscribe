import { type Dispatch, useReducer } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { canvasReducer } from "../reducer/canvasReducer";
import { createInitialControllerState } from "../reducer/createInitialControllerState";

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
