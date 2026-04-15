import type { CanvasControllerState } from "../CanvasTypes";

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
 * プラットフォーム別のキーボードショートカット定義
 * Mac (⌘) と Windows/Linux (Ctrl) で異なるショートカットを設定可能
 * 各プラットフォームに複数のショートカットを登録できる
 */
export type PlatformKeyBindings = {
	/** Mac用のショートカット配列（metaキーを使用） */
	mac?: KeyBinding[];
	/** Windows/Linux用のショートカット配列（ctrlキーを使用） */
	win?: KeyBinding[];
	/** 明示的に指定されていないプラットフォーム用のデフォルト */
	default: KeyBinding[];
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
	canExecute: (state: CanvasControllerState) => boolean;

	/**
	 * コマンドを実行し、新しい CanvasControllerState を返す
	 * 純粋関数として実装（副作用なし）
	 */
	execute: (state: CanvasControllerState) => CanvasControllerState;

	/**
	 * プラットフォーム別キーボードショートカット
	 */
	shortcuts?: PlatformKeyBindings;
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
