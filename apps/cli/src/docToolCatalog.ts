import {
	isCanvasHandleTool,
	type CanvasToolDescriptor,
} from "@jiscribe/ai-tools";
import { standardCanvasToolSet } from "@jiscribe/doc-tools/canvas-tools";
import { z } from "zod";

/**
 * The one doc-side tool left out: its history lives in the process that made the
 * edits, and every CLI run is a process of its own.
 */
const UNDO_TOOL_NAME = "undo";

/**
 * Every tool `jiscribe op` can run, in declaration order: the ones a document
 * alone can answer, as jiscribe-mcp registers them against a file, minus undo.
 */
export const docToolDescriptors: readonly CanvasToolDescriptor[] =
	standardCanvasToolSet.descriptors.filter(
		(descriptor) =>
			!isCanvasHandleTool(descriptor) && descriptor.name !== UNDO_TOOL_NAME,
	);

/** What a tool name came to: a runnable declaration, or why there is none. */
export type DocToolLookup =
	| { ok: true; descriptor: CanvasToolDescriptor }
	| { ok: false; message: string };

/**
 * Looks a tool up by the name jiscribe-mcp registers it under, telling a screen
 * tool and undo apart from a name that does not exist.
 *
 * @param name - The tool name as typed; matched exactly, case included
 */
export const findDocTool = (name: string): DocToolLookup => {
	const descriptor = standardCanvasToolSet.descriptors.find(
		(candidate) => candidate.name === name,
	);
	if (descriptor === undefined) {
		return {
			ok: false,
			message: `unknown tool: ${name} (jiscribe tools lists the ones there are)`,
		};
	}
	if (descriptor.name === UNDO_TOOL_NAME) {
		return {
			ok: false,
			message:
				"undo is not offered here: the CLI keeps no history between runs, so it has nothing of yours to step back to. Take a change back with git (or whatever else keeps the file's history)",
		};
	}
	if (isCanvasHandleTool(descriptor)) {
		return {
			ok: false,
			message: `${name} acts on a canvas drawn on screen, so it needs a viewer; it is only available in jiscribe-mcp`,
		};
	}
	return { ok: true, descriptor };
};

/**
 * The argument schema a tool's arguments are validated against: the declaration
 * closed with `.strict()`, as jiscribe-mcp closes it, so a mistyped key is
 * refused instead of being dropped and defaulted.
 *
 * @param descriptor - A doc-side declaration; nothing is added to its properties (jiscribe-mcp adds `path`, which here is the command's file argument)
 */
export const toArgsSchema = (descriptor: CanvasToolDescriptor) =>
	z.object(descriptor.inputSchema).strict();
