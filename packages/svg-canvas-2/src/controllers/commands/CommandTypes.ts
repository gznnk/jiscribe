import type { CanvasState } from "../../states/canvas/CanvasState";

/**
 * キーボードショートカットの定義
 */
export type KeyBinding = {
	/** キー名（例: "Delete", "a", "z"） */
	key: string;
	/** Ctrl キー */
	ctrl?: boolean;
	/** Shift キー */
	shift?: boolean;
	/** Alt キー */
	alt?: boolean;
	/** Cmd キー (Mac) */
	meta?: boolean;
};

/**
 * コマンドの定義
 * ショートカットキーとコンテキストメニューから実行される操作
 */
export type Command = {
	/** コマンドの一意識別子 */
	id: string;
	/** メニュー表示用ラベル */
	label: string;
	/** コマンドのカテゴリ */
	category?: "edit" | "view" | "arrange" | "selection";

	/**
	 * コマンドが実行可能かどうかを判定
	 * メニュー項目の有効/無効化に使用
	 */
	canExecute: (state: CanvasState) => boolean;

	/**
	 * コマンドを実行し、新しい CanvasState を返す
	 * 純粋関数として実装（副作用なし）
	 */
	execute: (state: CanvasState) => CanvasState;

	/**
	 * キーボードショートカット（複数可）
	 */
	shortcuts?: KeyBinding[];
};

/**
 * コンテキストメニューの項目定義
 */
export type CommandMenuItem = {
	/** 実行するコマンドID */
	commandId?: string;
	/** セパレーター（区切り線）として表示 */
	separator?: boolean;
};
