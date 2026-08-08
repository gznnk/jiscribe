import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { getEffectiveSelectedIds } from "../../utils/getEffectiveSelectedIds";
import { isArrangeableSelection } from "../../utils/isArrangeableSelection";
import { sortObjectIdsByZOrder } from "../../utils/sortObjectIdsByZOrder";
import type { ExecutableCommand } from "../CommandTypes";

export const SendToBackCommand: ExecutableCommand = {
	id: "sendToBack",
	label: "Send to Back",
	category: "arrange",
	shortcuts: {
		mac: [{ key: "{", meta: true }],
		win: [{ key: "{", ctrl: true }],
		default: [{ key: "{", ctrl: true }],
	},

	canExecute: (state) => {
		return isArrangeableSelection(state);
	},

	execute: (state) => {
		const selectedIds = getEffectiveSelectedIds(state);
		const commonParentId = state.objects[selectedIds[0]]?.parentId;
		const selectedSet = new Set(selectedIds);

		// Sort selectedIds by z-order so the stacking order among selected objects is preserved after the move
		const orderedSelectedIds = sortObjectIdsByZOrder(
			selectedIds,
			state.objects,
			state.rootIds,
		);

		if (commonParentId == null) {
			const updatedRootIds = state.rootIds.filter((id) => !selectedSet.has(id));
			updatedRootIds.unshift(...orderedSelectedIds);
			return {
				...state,
				rootIds: updatedRootIds,
				commitVersion: state.commitVersion + 1,
			};
		}

		const parent = state.objects[commonParentId] as GroupState;
		const updatedChildIds = parent.childIds.filter(
			(id) => !selectedSet.has(id),
		);
		updatedChildIds.unshift(...orderedSelectedIds);
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
