import { type Dispatch, useMemo } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { useCanvasStateMirror } from "./useCanvasStateMirror";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries/CanvasRegistries";

/**
 * A point in the undo history, taken by {@link CanvasHistoryHandle.mark} and
 * handed back to `revertTo`. Opaque: it pins the entry by identity and carries
 * nothing a caller can read. Marks stay valid only while the entry is still on
 * the stack — history keeps the last 50 entries, and taking a new branch
 * (editing after an undo) drops what was redoable.
 */
export type CanvasHistoryMark = {
	/** The pinned history entry, compared by identity and never read. */
	readonly entry: object;
};

/**
 * Imperative undo-history API exposed on the `history` namespace of the Canvas
 * handle (`ref.current.history`). Drives the canvas's own stack — the one the
 * Ctrl+Z shortcut moves — so a host that redirects undo to its own editor
 * (the `onUndo` prop) must not mix the two.
 *
 * `mark` / `revertTo` are what a batch of edits is rolled back through: a host
 * generating a layout, or an agent trying one, marks first, applies however many
 * edits it takes, looks at the result and either keeps it or drops the lot with
 * a single call. Undoing a counted number of steps cannot do the same job —
 * how many entries a batch of edits records is not knowable up front (commits
 * coalesce, and a no-op edit records nothing).
 */
export type CanvasHistoryHandle = {
	/** Whether there is an entry to undo, and the canvas is in a state to accept it (no drag, no open text editor). */
	canUndo(): boolean;
	/** Whether there is an entry to redo, under the same conditions as {@link canUndo}. */
	canRedo(): boolean;
	/**
	 * Undoes one entry.
	 *
	 * @returns Whether it was applied — false leaves the canvas untouched
	 *   (nothing to undo, or a gesture / text edit in progress)
	 */
	undo(): boolean;
	/** Redoes one entry, under the same conditions as {@link undo}. */
	redo(): boolean;
	/**
	 * Pins the document as it stands right now, for `revertTo` to come back to.
	 *
	 * @returns The mark; taking one changes nothing and costs nothing
	 */
	mark(): CanvasHistoryMark;
	/**
	 * Undoes back to a mark, however many entries that takes, in one step — the
	 * document is materialized once, not once per entry undone.
	 *
	 * Redo is unaffected: everything undone stays redoable, one entry at a time,
	 * exactly as it would be after that many separate undos.
	 *
	 * @param mark - A mark from {@link mark} on this canvas
	 * @returns Whether the document is now at the mark. False changes nothing at
	 *   all — the mark was already undone past or has fallen off the stack, or a
	 *   gesture / text edit is in progress. True with no movement means the
	 *   document was already there
	 */
	revertTo(mark: CanvasHistoryMark): boolean;
};

/**
 * Builds the stable history sub-handle assembled into the Canvas handle.
 *
 * @param dispatch - The canvas reducer's dispatch. `undo` / `redo` go through
 *   the commands of the same name, and `revertTo` through an action of its own;
 *   all three are still gated on the undo command being available, so a
 *   restricted `initialConfig.commands` that drops it disables this handle too
 * @param canvasState - Current controller state, read at call time (not at
 *   render time) so the handle stays referentially stable
 * @param registries - The canvas's registry bundle; its command registry both
 *   answers the `can*` queries and decides what a dispatch will do
 */
export const useHistoryHandle = (
	dispatch: Dispatch<CanvasAction>,
	canvasState: CanvasControllerState,
	registries: CanvasRegistries,
): CanvasHistoryHandle => {
	const canvasStateRef = useCanvasStateMirror(canvasState);

	return useMemo(() => {
		// The reducer resolves the same way, so this is exactly what a dispatch
		// would do (handleCommand).
		const canRun = (commandId: string): boolean => {
			const command = registries.command.get(commandId);
			return (
				command?.execute !== undefined &&
				command.canExecute(canvasStateRef.current, registries)
			);
		};
		const run = (commandId: string): boolean => {
			if (!canRun(commandId)) {
				return false;
			}
			dispatch({ type: "COMMAND", commandId });
			return true;
		};

		return {
			canUndo: () => canRun("undo"),
			canRedo: () => canRun("redo"),
			undo: () => run("undo"),
			redo: () => run("redo"),

			mark: () => ({ entry: canvasStateRef.current.history.present }),

			revertTo: (mark) => {
				const { history } = canvasStateRef.current;
				if (history.present === mark.entry) {
					return true;
				}
				// The reducer checks reachability again (it must, being dispatchable
				// from anywhere); this one is what lets the caller be told, and it
				// keeps revert unavailable wherever undo itself is — a canvas
				// configured without the undo command has no back door here.
				if (
					!history.past.some((entry) => entry === mark.entry) ||
					!canRun("undo")
				) {
					return false;
				}
				dispatch({ type: "REVERT_HISTORY", entry: mark.entry });
				return true;
			},
		};
	}, [canvasStateRef, dispatch, registries]);
};
