import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import { objectMapperRegistry } from "../../../states/registry/ObjectMapperRegistry";
import type { Command } from "../CommandTypes";

/**
 * テキスト編集を開始できる図形か。
 * テキストを持つ図形（features.text）のみを正とし、構造ガードで値の妥当性を補う。
 * isTextStyleState 単体は「テキスト属性に矛盾が無いか」を見る緩いガードで、
 * テキストを一切持たない図形（svg / polyline / polygon など）も通してしまうため、
 * プロパティ更新側（isPropertySupported）と同じ features.text を基準に揃える。
 */
const canEditText = (
	object: ObjectState | undefined,
): object is ObjectState & { text?: string } =>
	object != null &&
	objectMapperRegistry.getFeatures(object.type)?.text === true &&
	isTextStyleState(object);

export const StartTextEditCommand: Command = {
	id: "start-text-edit",
	label: "Start Text Editing",
	category: "edit",
	shortcuts: {
		default: [{ code: "Enter" }],
	},

	canExecute(state) {
		// 既にテキスト編集中の場合は実行不可
		if (state.textEditState) {
			return false;
		}

		// 単一選択のみ
		if (state.selectedIds.length !== 1) {
			return false;
		}

		return canEditText(state.objects[state.selectedIds[0]]);
	},

	execute(state) {
		const objectId = state.selectedIds[0];
		const targetObject = state.objects[objectId];

		if (!canEditText(targetObject)) {
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
