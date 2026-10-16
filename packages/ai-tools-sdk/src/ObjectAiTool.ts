// The contract a plugin offers AI tools for its own shapes through. A package of its
// own rather than part of @jiscribe/ai-tools: ai-tools develops against the shipped
// plugins, and a plugin reaching back into it would close a workspace dependency
// cycle. Plugins take it from @jiscribe/canvas-sdk/tools.
//
// Arguments are zod raw shapes: the host hands them to the MCP SDK as they are, and
// zod is a peer dependency so a plugin's schemas are the same zod the host reads.

import type { ObjectDoc } from "@jiscribe/doc";
import type { z } from "zod";

/**
 * Arguments a tool's `apply` / `read` receives once erased into a shared list: the
 * tool's own properties after its `inputSchema` validated them, with no `id` (the
 * target is handed over as the object itself).
 */
export type ObjectAiToolArgs = Record<string, unknown>;

/** What a writing tool hands back. */
export type ObjectAiToolChange<Doc extends ObjectDoc = ObjectDoc> = {
	/**
	 * The object as it should stand afterwards: same `id` and `type`, a new object rather
	 * than the one passed in. Checked against the type's `validateDoc` and the names the
	 * type holds before it replaces anything, so a value the parser would refuse or drop
	 * fails the call instead
	 */
	doc: Doc;
	/** The sentence the AI reads back: what changed, in terms it can act on next */
	text: string;
};

type ObjectAiToolBase<Shape extends z.ZodRawShape> = {
	/**
	 * Tool name shown to the model, `<type>_<verb>` by convention (`table_insert_tracks`,
	 * `table_read`) so tools of different plugins neither collide nor read alike. It must
	 * not repeat a built-in tool or another plugin's tool; registering one that does throws
	 */
	name: string;
	/** The wording the model reads to decide when to call the tool */
	description: string;
	/**
	 * The one object type the tool acts on. The tool is left off the tool list of a host
	 * whose capabilities do not offer this type as creatable
	 */
	objectType: string;
	/**
	 * The arguments as a zod raw shape (the properties, not a `z.object`), nested objects
	 * closed with `.strict()`. A property that may be left out is `.optional()`; one with
	 * `.default()` arrives filled in. The target is added as `id` by the host, so the shape
	 * must not name `id` itself
	 */
	inputSchema: Shape;
};

/** A tool that changes its object; exclusive with {@link ObjectAiReadTool}. */
export type ObjectAiWriteTool<
	Shape extends z.ZodRawShape = z.ZodRawShape,
	Doc extends ObjectDoc = ObjectDoc,
	Args = z.output<z.ZodObject<Shape>>,
> = ObjectAiToolBase<Shape> & {
	/**
	 * Builds the object as it should stand. Must not mutate `objectDoc`; throw an `Error`
	 * to refuse, and its message goes back to the AI as the failure
	 */
	apply(objectDoc: Doc, args: Args): ObjectAiToolChange<Doc>;
	read?: never;
};

/** A tool that only reads its object; it never writes the document back. */
export type ObjectAiReadTool<
	Shape extends z.ZodRawShape = z.ZodRawShape,
	Doc extends ObjectDoc = ObjectDoc,
	Args = z.output<z.ZodObject<Shape>>,
> = ObjectAiToolBase<Shape> & {
	/**
	 * Answers with the text the AI reads. Throw an `Error` to refuse, and its message goes
	 * back to the AI as the failure
	 */
	read(objectDoc: Doc, args: Args): string;
	apply?: never;
};

/**
 * One AI tool a plugin offers for an object type of its own: it acts on the single
 * object the call names by `id`, either rebuilding it (`apply`) or reading it (`read`).
 * Erased to plain arguments so tools with different schemas share one list; write one
 * with {@link defineObjectAiTool}. `apply` / `read` are declared as methods so a tool
 * typed against its own doc and arguments is assignable here without a cast.
 */
export type ObjectAiToolDefinition =
	| ObjectAiWriteTool<z.ZodRawShape, ObjectDoc, ObjectAiToolArgs>
	| ObjectAiReadTool<z.ZodRawShape, ObjectDoc, ObjectAiToolArgs>;

/**
 * The AI tools one plugin offers, exported from its `./tools` entry and gathered by the
 * host alongside the doc plugins.
 */
export type AiToolPlugin = {
	/** Names the plugin in errors, such as a duplicate tool name */
	id: string;
	/** The plugin's tools, in the order the model sees them */
	tools: readonly ObjectAiToolDefinition[];
};

/**
 * Declares one object tool, typing `apply` / `read` against the real arguments.
 *
 * @param tool - The tool. `args` is inferred from `inputSchema`; annotate the first
 *   parameter of `apply` / `read` with the plugin's own doc type (`TableDoc`) to read it
 *   as one — the host only ever calls it with an object of `objectType`, already parsed
 * @returns The same tool, its argument types erased so it fits an
 *   {@link AiToolPlugin}'s list
 */
export const defineObjectAiTool = <
	Shape extends z.ZodRawShape,
	Doc extends ObjectDoc = ObjectDoc,
>(
	tool: ObjectAiWriteTool<Shape, Doc> | ObjectAiReadTool<Shape, Doc>,
): ObjectAiToolDefinition => tool;
