import { CopyCommand } from "./CopyCommand";
import { DeleteCommand } from "./DeleteCommand";
import type { Command } from "../CommandTypes";

export const CutCommand: Command = {
	id: "cut",
	label: "Cut",
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyX", meta: true }],
		win: [{ code: "KeyX", ctrl: true }],
		default: [{ code: "KeyX", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state) => {
		// selectedVertex をクリアしてから合成する。
		// そのままだと CopyCommand は polyline 全体をコピーするのに
		// DeleteCommand が頂点 1 個だけを削除する非対称な結果になる。
		const stateWithClipboard = CopyCommand.execute({
			...state,
			selectedVertex: null,
		});
		return DeleteCommand.execute(stateWithClipboard);
	},
};
