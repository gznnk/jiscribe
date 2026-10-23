import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Which of the two grouping commands the group / ungroup control runs on the
 * selection: `ungroup` for a sole selected group, `group` for anything else.
 * Whether the control is offered at all is isGroupingOffered's to say.
 *
 * @param state - Only `selection.objectIds` and the type of a sole selected object are read
 * @returns `"ungroup"` while exactly one object is selected and it is a group; `"group"` otherwise, an empty selection included
 */
export const resolveGroupingCommandId = (
	state: Pick<CanvasControllerState, "selection" | "objects">,
): "group" | "ungroup" => {
	const { objectIds: selectedIds } = state.selection;
	if (selectedIds.length !== 1) {
		return "group";
	}
	return state.objects[selectedIds[0]]?.type === "group" ? "ungroup" : "group";
};
