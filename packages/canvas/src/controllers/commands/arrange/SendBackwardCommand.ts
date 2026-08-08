import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { getEffectiveSelectedIds } from "../../utils/getEffectiveSelectedIds";
import { isArrangeableSelection } from "../../utils/isArrangeableSelection";
import type { ExecutableCommand } from "../CommandTypes";

export const SendBackwardCommand: ExecutableCommand = {
	id: "sendBackward",
	label: "Send Backward",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "[", meta: true }],
		win: [{ key: "[", ctrl: true }],
		default: [{ key: "[", ctrl: true }],
	},

	canExecute: (state) => {
		return isArrangeableSelection(state);
	},

	execute: (state) => {
		const selectedIds = getEffectiveSelectedIds(state);
		const commonParentId = state.objects[selectedIds[0]]?.parentId;
		const sourceIds =
			commonParentId != null
				? (state.objects[commonParentId] as GroupState).childIds
				: state.rootIds;

		const selectedSet = new Set(selectedIds);
		const updatedIds = [...sourceIds];
		for (let i = 1; i < updatedIds.length; i++) {
			const id = updatedIds[i];
			if (selectedSet.has(id) && !selectedSet.has(updatedIds[i - 1])) {
				[updatedIds[i - 1], updatedIds[i]] = [updatedIds[i], updatedIds[i - 1]];
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
