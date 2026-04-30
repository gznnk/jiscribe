import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { isSameGroupSelection } from "../../utils/isSameGroupSelection";
import type { Command } from "../CommandTypes";

export const SendToBackCommand: Command = {
	id: "sendToBack",
	label: "最背面へ移動",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "[", meta: true, shift: true }],
		win: [{ key: "[", ctrl: true, shift: true }],
		default: [{ key: "[", ctrl: true, shift: true }],
	},

	canExecute: (state) => {
		return isSameGroupSelection(state);
	},

	execute: (state) => {
		const commonParentId = state.objects[state.selectedIds[0]]?.parentId;
		const selectedSet = new Set(state.selectedIds);

		if (commonParentId == null) {
			const updatedRootIds = state.rootIds.filter(
				(id) => !selectedSet.has(id),
			);
			updatedRootIds.unshift(...state.selectedIds);
			return { ...state, rootIds: updatedRootIds, lastCommitTime: Date.now() };
		}

		const parent = state.objects[commonParentId] as GroupState;
		const updatedChildIds = parent.childIds.filter(
			(id) => !selectedSet.has(id),
		);
		updatedChildIds.unshift(...state.selectedIds);
		return {
			...state,
			objects: {
				...state.objects,
				[commonParentId]: { ...parent, childIds: updatedChildIds },
			},
			lastCommitTime: Date.now(),
		};
	},
};
