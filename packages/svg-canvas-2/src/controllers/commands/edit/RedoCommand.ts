import type { Command } from "../CommandTypes";

/**
 * Redo コマンド
 * ショートカット: Ctrl/Cmd+Shift+Z または Ctrl/Cmd+Y
 */
export const RedoCommand: Command = {
	id: "redo",
	label: "Redo",
	category: "edit",

	shortcuts: {
		mac: [
			{ key: "z", meta: true, shift: true },
			{ key: "y", meta: true },
		],
		win: [
			{ key: "z", ctrl: true, shift: true },
			{ key: "y", ctrl: true },
		],
		default: [
			{ key: "z", ctrl: true, shift: true },
			{ key: "y", ctrl: true },
		],
	},

	canExecute: (state) => {
		// ドラッグ中、テキスト編集中は実行不可
		if (state.eventStartState !== null) return false;
		if (state.textEditState !== null) return false;
		// 履歴の有無は Canvas.tsx 側でチェック
		return true;
	},

	execute: (state) => {
		// 実際の処理は Canvas.tsx の handleCommand で行う
		return state;
	},
};
