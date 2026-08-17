// A reference to the canvas API a tool ends up driving. Tool names are allowed to
// differ from the members behind them — the canvas namespaces its API where the
// tool namespace is flat, so `viewport.centerOn` folds into `center_view` — but
// the correspondence is declared rather than left to be guessed. Written as a
// template literal type over the real declarations, so only members that exist
// can be named.

import type { CanvasHandle } from "@jiscribe/canvas";
import type { DocOps } from "@jiscribe/canvas/doc";

/**
 * Every member of the imperative canvas handle as one dotted path, e.g.
 * `"viewport.centerOn"`, `"export.capturePng"`.
 */
type CanvasHandleMemberPath = {
	[
		Namespace in keyof CanvasHandle & string
	]: `${Namespace}.${keyof CanvasHandle[Namespace] & string}`;
}[keyof CanvasHandle & string];

/**
 * One canvas API a tool drives: a headless doc-ops member, a member of the
 * imperative canvas handle, or `"agent"` for the tools that have no canvas member
 * behind them at all (reading the document back, and the AI's own undo history,
 * both of which the host owns).
 */
export type CanvasApiRef =
	| `docOps.${keyof DocOps & string}`
	| `handle.${CanvasHandleMemberPath}`
	| "agent";
