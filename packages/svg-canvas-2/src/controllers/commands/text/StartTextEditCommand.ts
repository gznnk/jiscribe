import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import type { Command } from "../CommandTypes";

export const StartTextEditCommand: Command = {
	id: "start-text-edit",
	label: "テキスト編集を開始",
	category: "edit",
	shortcuts: {
		default: [{ key: "Enter" }],
	},

	canExecute(state) {
		// 既にテキスト編集中の場合は実行不可
		if (state.textEditState) return false;

		// 単一選択のみ
		if (state.selectedIds.length !== 1) return false;

		const selectedId = state.selectedIds[0];
		const selectedObject = state.objects[selectedId];
		return selectedObject != null && isTextStyleState(selectedObject);
	},

	execute(state) {
		const objectId = state.selectedIds[0];
		const targetObject = state.objects[objectId];

		if (!isTextStyleState(targetObject)) {
			return state;
		}

		return {
			...state,
			textEditState: {
				objectId,
				text: targetObject.text ?? "",
			},
		};
	},
};
