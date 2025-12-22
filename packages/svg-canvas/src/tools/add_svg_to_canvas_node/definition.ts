import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the add_svg_to_canvas_node tool.
 * Explains the purpose and behavior of the SVG Diagram node.
 */
const TOOL_DESCRIPTION = `
Adds an SVG Diagram node to the canvas.  
The node receives input from connected LLM or text nodes.  
It converts text descriptions into SVG diagrams using a diagram generation model and displays the generated diagram on the canvas.  
The SVG Diagram node does not send any output to other nodes.  
Returns a JSON object containing the node ID, node type and the size (width and height).
`;

/**
 * Tool definition for adding an SVG Diagram node to the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const svgToCanvasToolDefinition: ToolDefinition = {
	name: "add_svg_to_canvas_node",
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
	],
};
