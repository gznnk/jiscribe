import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the update_diagram tool.
 * Explains the purpose and behavior of updating diagram properties.
 */
const TOOL_DESCRIPTION = `
Updates properties of an existing diagram (shape or node) on the canvas.
This tool allows programmatic modification of any diagram attributes such as position (x, y),
size (width, height), colors (fill, stroke), text properties, and other visual properties.
You can update multiple properties at once by providing them in the data object.
The AI should have access to the diagram's current properties to know which fields are available.
Returns a JSON object containing the updated diagram ID and a success status.
`;

/**
 * Tool definition for updating a diagram on the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const updateDiagramToolDefinition: ToolDefinition = {
	name: "update_diagram",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "id",
			type: "string",
			description: "The ID of the diagram to update.",
		},
		{
			name: "data",
			type: "string",
			description:
				'A JSON string containing the properties to update. Can include any valid diagram properties such as x, y, width, height, fill, stroke, text, etc. Example: \'{"x": 100, "y": 200, "fill": "#ff0000"}\'',
		},
	],
};
