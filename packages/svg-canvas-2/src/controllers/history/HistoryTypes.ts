import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";

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
 * 履歴スタックを操作するアクション
 */
export type HistoryAction =
	| { type: "RECORD"; doc: CanvasDoc }
	| { type: "UNDO" }
	| { type: "REDO" }
	| { type: "REPLACE"; doc: CanvasDoc }
	| { type: "CLEAR" };
