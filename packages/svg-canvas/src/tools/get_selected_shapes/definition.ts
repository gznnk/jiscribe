import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the get_selected_shapes tool.
 * Explains the purpose and behavior of retrieving selected shapes.
 */
const TOOL_DESCRIPTION = `
Retrieves information about all currently selected shapes on the canvas.
Returns an array of shapes in data format, recursively converting from State to Data.
Each shape includes all its properties and nested items (if any) in a serializable format.
This is useful for understanding what the user has selected and working with those shapes.
`;

/**
 * Tool definition for retrieving selected shapes from the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const selectedShapesToolDefinition: ToolDefinition = {
	name: "get_selected_shapes",
	description: TOOL_DESCRIPTION,
	parameters: [],
};
