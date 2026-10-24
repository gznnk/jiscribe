// What every host serving these declarations decides the same way: which side
// of it a tool runs on, and how an applied op is put into words for the AI.
// Kept here so two hosts (jiscribe-mcp, the jiscribe CLI) cannot drift apart.

import type { AiCanvasOpOutcome } from "./canvasOps";
import type { CanvasToolDescriptor } from "./canvasTools";

/**
 * Whether a tool needs a mounted canvas (a viewer) rather than a document alone.
 * Read off the declaration's `drives`, so it is known without building any
 * arguments.
 *
 * @param descriptor - Any declaration of the set; it needs a canvas when one of its `drives` names a `handle.*` API, even if only some arguments reach it
 */
export const isCanvasHandleTool = (descriptor: CanvasToolDescriptor): boolean =>
	descriptor.drives.some((ref) => ref.startsWith("handle."));

/**
 * The reply for a tool whose `toOp` produced an op of the other kind than its
 * `drives` declares. Only a broken declaration gets here, so the text starts
 * with `internal error:`.
 *
 * @param descriptor - The tool whose op disagreed; which way it disagreed is read from {@link isCanvasHandleTool}
 */
export const toDrivesMismatchText = (
	descriptor: CanvasToolDescriptor,
): string =>
	isCanvasHandleTool(descriptor)
		? `internal error: ${descriptor.name} is declared to drive the canvas handle but produced a document operation`
		: `internal error: ${descriptor.name} is declared to need only a document but produced a canvas-handle operation`;

/**
 * The text an applied op is replied with. A failure is prefixed `error:`,
 * except one applyCanvasOp already marked `internal error:`, whose prefix is
 * kept rather than doubled — so the first token of a reply is `error:` or
 * `internal error:` on every failure.
 *
 * @param outcome - What applyCanvasOp (or a canvas-handle op) returned; its `text` comes back unchanged when `ok`
 */
export const toOutcomeText = (outcome: AiCanvasOpOutcome): string => {
	if (outcome.ok) {
		return outcome.text;
	}
	return outcome.text.startsWith("internal error:")
		? outcome.text
		: `error: ${outcome.text}`;
};

/**
 * The reply for a tool call that threw: `error: <message>` for an error the
 * user can act on, `internal error: <message>` for anything else.
 *
 * @param error - Whatever was caught; a non-Error is stringified
 * @param isUserError - The host's own test for an error whose message is fit to show as the user's (it knows the error classes it throws, e.g. jiscribe-mcp's CanvasHostError)
 */
export const toThrownText = (
	error: unknown,
	isUserError: (error: unknown) => error is Error,
): string => {
	if (isUserError(error)) {
		return `error: ${error.message}`;
	}
	return `internal error: ${error instanceof Error ? error.message : String(error)}`;
};
