import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the add_llm_node tool.
 * Explains the purpose and behavior of the LLM node.
 */
const TOOL_DESCRIPTION = `
Adds an LLM (Large Language Model) node to the canvas.  
The node can receive input from connected text nodes or other nodes.  
It processes the text with a language model according to the provided instructions and sends the output to connected nodes.  
The LLM node can be configured with specific instructions to control its behavior.  
Returns a JSON object containing the node ID, node type and the size (width and height).
`;

/**
 * Tool definition for adding an LLM node to the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const llmToolDefinition: ToolDefinition = {
	name: "add_llm_node",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "x",
			type: "number",
			description: "The X coordinate of the center of the node on the canvas.",
		},
		{
			name: "y",
			type: "number",
			description: "The Y coordinate of the center of the node on the canvas.",
		},
		{
			name: "instructions",
			type: "string",
			description:
				"The instructions to guide the LLM node's processing behavior.",
		},
	],
};
