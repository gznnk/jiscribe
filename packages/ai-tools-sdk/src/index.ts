// The AI tools a plugin offers for its own shapes, handed to a host's tool set
// beside the doc plugins (plugins reach it through @jiscribe/canvas-sdk/tools).
export {
	type AiToolPlugin,
	defineObjectAiTool,
	type ObjectAiReadTool,
	type ObjectAiToolArgs,
	type ObjectAiToolChange,
	type ObjectAiToolDefinition,
	type ObjectAiWriteTool,
} from "./ObjectAiTool";
// The typography vocabulary a tool styling whole bodies of text shares with the
// built-in set_style, and the weight spelling a document keeps.
export {
	AI_FONT_WEIGHTS,
	canonicalizeFontWeight,
	textSlotStyleSchema,
} from "./textSlotStyleSchema";
// The vocabulary a tool decorating part of a text shares with the built-in
// set_text_style: which characters, and the typography they may carry on their own.
export {
	inlineTextStyleSchema,
	textMatchSchema,
} from "./inlineTextStyleSchema";
