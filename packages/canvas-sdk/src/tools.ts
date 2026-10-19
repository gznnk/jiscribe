/**
 * AI-tool entry (`@jiscribe/canvas-sdk/tools`): what a plugin's own `./tools` entry is
 * written against to offer AI tools for its shapes. Headless like `./doc`, since the
 * tools run wherever the document is applied (a Node MCP server included).
 *
 * Write the argument schemas in zod. zod is a peer dependency of the contract, so take it
 * as a peer at the version the workspace catalog pins, the same zod the host reads.
 * textSlotStyleSchema / canonicalizeFontWeight are the typography set_style declares,
 * for a tool styling text slots of its own.
 * Authoring steps are in packages/canvas/docs/13-authoring-plugins.md.
 */

export {
	type AiToolPlugin,
	canonicalizeFontWeight,
	defineObjectAiTool,
	type ObjectAiReadTool,
	type ObjectAiToolArgs,
	type ObjectAiToolChange,
	type ObjectAiToolDefinition,
	type ObjectAiWriteTool,
	textSlotStyleSchema,
} from "@jiscribe/ai-tools-sdk";
