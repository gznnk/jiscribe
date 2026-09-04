import type { CanvasDoc } from "@jiscribe/canvas";
import type { CanvasParseResult } from "@jiscribe/doc";

/**
 * Why the text currently in the editor cannot be shown as a canvas.
 *
 * `parse` covers a broken JSON syntax and an unexpected failure inside the
 * validator (both leave us without any document at all); `validation` covers
 * text that is JSON but does not hold up as a CanvasDoc. The per-error details
 * are surfaced in VSCode's Problems panel by the Extension (DiagnosticProvider),
 * so only the parser's own message is carried here.
 */
export type DocViewError =
	{ kind: "parse"; message: string } | { kind: "validation" };

/**
 * What the Webview shows for the document being edited.
 *
 * `doc` is the **last text that parsed clean**, not the last text received: while
 * the editor holds broken text the canvas stays mounted on that document and the
 * error is shown over it (#136). Hand editing and AI streaming both spend most
 * keystrokes in an invalid state, and dropping the document there would rebuild
 * the whole canvas — reducer state, listeners, SVG tree — and lose the viewport
 * on every recovery.
 */
export type DocViewState = {
	/** Last document that parsed clean, or null before the first one arrives. */
	doc: CanvasDoc | null;
	/** saveNonce that delivered `doc`, echoed to the canvas as `syncNonce`. */
	syncNonce: string | undefined;
	/** Error of the latest text, or null when it parsed clean. */
	error: DocViewError | null;
};

export const initialDocViewState: DocViewState = {
	doc: null,
	syncNonce: undefined,
	error: null,
};

const isSameError = (
	prev: DocViewError | null,
	next: DocViewError,
): boolean => {
	if (prev === null || prev.kind !== next.kind) {
		return false;
	}
	return prev.kind === "parse" && next.kind === "parse"
		? prev.message === next.message
		: true;
};

const withError = (prev: DocViewState, error: DocViewError): DocViewState =>
	// Returning `prev` unchanged for a repeated error keeps the state identity
	// stable, so the keystrokes that follow a broken edit do not re-render the
	// mounted canvas at all.
	isSameError(prev.error, error) ? prev : { ...prev, error };

/**
 * Folds one parse result into the view state.
 *
 * @param prev State before this update; its `doc` is carried over unchanged for
 *   every failing result, which is what keeps the canvas mounted.
 * @param result Outcome of `canvasParser.parse` for the text just received.
 * @param saveNonce Nonce the Extension attached to the update, adopted only when
 *   the result is `ok` (it identifies the text now on screen). Undefined for an
 *   external change that is not a fold-back of our own save.
 */
export const applyParseResult = (
	prev: DocViewState,
	result: CanvasParseResult,
	saveNonce: string | undefined,
): DocViewState => {
	switch (result.kind) {
		case "ok":
			return { doc: result.doc, syncNonce: saveNonce, error: null };

		case "structure-error":
		case "semantic-error":
			return withError(prev, { kind: "validation" });

		case "syntax-error":
		case "internal-error":
			return withError(prev, { kind: "parse", message: result.message });
	}
};
