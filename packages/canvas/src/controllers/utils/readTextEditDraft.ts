import type { CanvasControllerState, TextEditDraft } from "../CanvasTypes";

/**
 * The open text-editing session's draft, without its owner. A reader that needs
 * the object being edited goes through readOpenTextEdit instead.
 *
 * @param state - The controller state; only `mode` is read
 * @returns null unless `mode` is `"textEdit"`
 */
export const readTextEditDraft = (
	state: Pick<CanvasControllerState, "mode">,
): TextEditDraft | null =>
	state.mode.kind === "textEdit" ? state.mode.draft : null;
