import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { isSameGroupSelection } from "../../utils/isSameGroupSelection";
import type { Command } from "../CommandTypes";

export const SendToBackCommand: Command = {
	id: "sendToBack",
	label: "Send to Back",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "{", meta: true }],
		win: [{ key: "{", ctrl: true }],
		default: [{ key: "{", ctrl: true }],
	},

	canExecute: (state) => {
		return isSameGroupSelection(state);
	},

	execute: (state) => {
		const commonParentId = state.objects[state.selectedIds[0]]?.parentId;
		const selectedSet = new Set(state.selectedIds);

		if (commonParentId == null) {
			const updatedRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
			updatedRootIds.unshift(...state.selectedIds);
			return { ...state, rootIds: updatedRootIds, commitVersion: state.commitVersion + 1 };
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
			commitVersion: state.commitVersion + 1,
		};
	},
};
