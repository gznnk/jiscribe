import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { CanvasState } from "../states/canvas/CanvasState";

/**
 * 履歴スタックの状態
 */
export type HistoryState = {
	/** 過去の状態（Undoスタック） */
	past: CanvasDoc[];
	/** 現在の状態 */
	present: CanvasDoc;
	/** 未来の状態（Redoスタック） */
	future: CanvasDoc[];
};

/**
 * Canvas state extended with history management for the controller layer
 * This combines the pure canvas state with undo/redo history
 */
export type CanvasControllerState = CanvasState & {
	history: HistoryState;
};
