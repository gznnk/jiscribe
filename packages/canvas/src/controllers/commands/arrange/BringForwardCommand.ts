import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { isSameGroupSelection } from "../../utils/isSameGroupSelection";
import type { Command } from "../CommandTypes";

export const BringForwardCommand: Command = {
	id: "bringForward",
	label: "Bring Forward",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "]", meta: true }],
		win: [{ key: "]", ctrl: true }],
		default: [{ key: "]", ctrl: true }],
	},

	canExecute: (state) => {
		return isSameGroupSelection(state);
	},

	execute: (state) => {
		const commonParentId = state.objects[state.selectedIds[0]]?.parentId;
		const sourceIds =
			commonParentId != null
				? (state.objects[commonParentId] as GroupState).childIds
				: state.rootIds;

		const selectedSet = new Set(state.selectedIds);
		const updatedIds = [...sourceIds];
		for (let i = updatedIds.length - 2; i >= 0; i--) {
			const id = updatedIds[i];
			if (selectedSet.has(id) && !selectedSet.has(updatedIds[i + 1])) {
				[updatedIds[i], updatedIds[i + 1]] = [updatedIds[i + 1], updatedIds[i]];
			}
		}

		if (commonParentId == null) {
			return {
				...state,
				rootIds: updatedIds,
				commitVersion: state.commitVersion + 1,
			};
		}

		const parent = state.objects[commonParentId] as GroupState;
		return {
			...state,
			objects: {
				...state.objects,
				[commonParentId]: { ...parent, childIds: updatedIds },
			},
			commitVersion: state.commitVersion + 1,
		};
	},
};
