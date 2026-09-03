import { type Dispatch, useMemo } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { useCanvasStateMirror } from "./useCanvasStateMirror";
import type { CanvasAction } from "../reducer/CanvasActions";
import {
	resolveRequestedSelection,
	type ResolvedSelection,
} from "../utils/resolveRequestedSelection";

/**
 * Imperative selection API exposed on the `selection` namespace of the Canvas
 * handle (`ref.current.selection`). Hosts select objects programmatically —
 * highlighting what a search or an agent just found, then fitting the view to it.
 *
 * Imperative for the same reason as the viewport: the canvas owns the live
 * selection through its gestures, so a controlled prop would fight a drag.
 * Reads flow out through `onSelectionChange`.
 */
export type CanvasSelectionHandle = {
	/** Ids selected right now: the shapes plus the selected connector, if any. */
	getSelectedIds(): string[];
	/**
	 * Replace the selection.
	 *
	 * @param ids - Ids to select; an empty list clears the selection. A connector
	 *   can only be selected on its own, so one asked for together with anything
	 *   else is dropped
	 * @returns What was applied and which requested ids were dropped
	 *   (see {@link ResolvedSelection}); unknown ids never throw
	 */
	select(ids: readonly string[]): ResolvedSelection;
};

/**
 * Builds the stable selection sub-handle assembled into the Canvas handle.
 *
 * @param dispatch - The canvas reducer's dispatch; select goes through SET_SELECTION
 * @param canvasState - Current controller state, read at call time (not at
 *   render time) so the handle stays referentially stable
 */
export const useSelectionHandle = (
	dispatch: Dispatch<CanvasAction>,
	canvasState: CanvasControllerState,
): CanvasSelectionHandle => {
	const canvasStateRef = useCanvasStateMirror(canvasState);

	return useMemo(
		() => ({
			getSelectedIds: () => {
				const { selectedIds, selectedConnectorId } = canvasStateRef.current;
				return selectedConnectorId === null
					? [...selectedIds]
					: [...selectedIds, selectedConnectorId];
			},
			select: (ids) => {
				dispatch({ type: "SET_SELECTION", ids });
				// The reducer resolves the same way, so this is what will be applied.
				return resolveRequestedSelection(ids, canvasStateRef.current.objects);
			},
		}),
		[canvasStateRef, dispatch],
	);
};
