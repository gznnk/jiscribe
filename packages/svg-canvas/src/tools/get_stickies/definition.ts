import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the get_stickies tool.
 * Explains the purpose and behavior of retrieving sticky notes.
 */
const TOOL_DESCRIPTION = `
Retrieves all sticky note diagrams from the current canvas.
Recursively searches through all diagrams including nested groups to find all sticky notes.
Returns an array of objects containing the ID and text content of each sticky note.
`;

/**
 * Tool definition for retrieving sticky notes from the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const getStickiesToolDefinition: ToolDefinition = {
	name: "get_stickies",
	description: TOOL_DESCRIPTION,
	parameters: [],
};
