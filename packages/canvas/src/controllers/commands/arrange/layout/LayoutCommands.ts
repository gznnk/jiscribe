import type { LayoutDirection } from "@jiscribe/layout";

import { applyLayoutResult } from "./applyLayoutResult";
import { hasLayoutScope, resolveLayoutScope } from "./resolveLayoutScope";
import { isSameJsonValue } from "../../../../states/canvas/utils/isSameJsonValue";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { createMultiSelectGroup } from "../../../selection/readers/createMultiSelectGroup";
import { reconcileConnectorVertices } from "../../../utils/reconcileConnectorVertices";
import { updateAffectedGroupBounds } from "../../../utils/updateAffectedGroupBounds";
import type { ExecutableCommand } from "../../CommandTypes";

/** Directions offered as commands; the other two are left to the AI tool. */
type CommandLayoutDirection = Extract<LayoutDirection, "TB" | "LR">;

const LAYOUT_COMMAND_IDS: Record<CommandLayoutDirection, string> = {
	TB: "layoutTopToBottom",
	LR: "layoutLeftToRight",
};

const LAYOUT_COMMAND_LABELS: Record<
	CommandLayoutDirection,
	{ en: string; ja: string }
> = {
	TB: { en: "Auto layout (top to bottom)", ja: "自動整列（上から下）" },
	LR: { en: "Auto layout (left to right)", ja: "自動整列（左から右）" },
};

/**
 * Arrange what resolveLayoutScope picks, or return `state` itself when that would
 * change nothing, so running it twice leaves no empty history entry and asks for no save.
 */
const executeLayout = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
	direction: CommandLayoutDirection,
): CanvasControllerState => {
	const graphs = resolveLayoutScope(state, registries);
	if (graphs.length === 0) {
		return state;
	}
	const { objects, writtenIds } = applyLayoutResult(
		state,
		graphs,
		direction,
		registries,
	);
	// Compared after the vertex pass the reducer runs on every commit
	// (reconcileConnectorVerticesIfCommitted): the corners stored last time are the
	// drawn ones, not the layout's.
	const laidOut = reconcileConnectorVertices(
		updateAffectedGroupBounds({ ...state, objects }, writtenIds),
		registries,
	);
	if (
		writtenIds.every((id) =>
			isSameJsonValue(laidOut.objects[id], state.objects[id]),
		)
	) {
		return state;
	}
	return {
		...laidOut,
		multiSelectGroup:
			state.multiSelectGroup === null
				? null
				: createMultiSelectGroup(
						state.selection.objectIds,
						laidOut.objects,
						registries,
						state.multiSelectGroup,
					),
		commitVersion: state.commitVersion + 1,
	};
};

/**
 * Factory for an automatic layout command running one way. The selection stays as
 * it was; the multi-select frame is rebuilt around where the objects went.
 */
const createLayoutCommand = (
	direction: CommandLayoutDirection,
): ExecutableCommand => ({
	id: LAYOUT_COMMAND_IDS[direction],
	label: LAYOUT_COMMAND_LABELS[direction],
	category: "arrange",
	canExecute: (state, registries) =>
		state.mode.kind !== "textEdit" && hasLayoutScope(state, registries),
	execute: (state, registries) => executeLayout(state, registries, direction),
});

export const LayoutTopToBottomCommand = createLayoutCommand("TB");

export const LayoutLeftToRightCommand = createLayoutCommand("LR");
