import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { isSameGroupSelection } from "../../utils/isSameGroupSelection";
import type { Command } from "../CommandTypes";

export const BringToFrontCommand: Command = {
	id: "bringToFront",
	label: "最前面へ移動",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "]", meta: true, shift: true }],
		win: [{ key: "]", ctrl: true, shift: true }],
		default: [{ key: "]", ctrl: true, shift: true }],
	},

	canExecute: (state) => {
		return isSameGroupSelection(state);
	},

	execute: (state) => {
		const commonParentId = state.objects[state.selectedIds[0]]?.parentId;

		if (commonParentId == null) {
			const updatedRootIds = state.rootIds.filter(
				(id) => !state.selectedIds.includes(id),
			);
			updatedRootIds.push(...state.selectedIds);
			return { ...state, rootIds: updatedRootIds, lastCommitTime: Date.now() };
		}

		const parent = state.objects[commonParentId] as GroupState;
		const updatedChildIds = parent.childIds.filter(
			(id) => !state.selectedIds.includes(id),
		);
		updatedChildIds.push(...state.selectedIds);
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
