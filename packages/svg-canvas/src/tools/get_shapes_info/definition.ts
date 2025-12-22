import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the get_shapes_info tool.
 * Explains the purpose and behavior of retrieving shape information.
 */
const TOOL_DESCRIPTION = `
Retrieves information about all shapes in the first level (top-level) of the canvas.
Returns an array of objects containing the ID, center coordinates (x, y), dimensions (width, height), rotation, scale, and optionally name and description of each shape.
Note: x and y represent the center coordinates of the shape, not the top-left corner.
This tool only returns shapes at the first level of the canvas items, not nested shapes within groups.
`;

/**
 * Tool definition for retrieving shape information from the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const shapesInfoToolDefinition: ToolDefinition = {
	name: "get_shapes_info",
	description: TOOL_DESCRIPTION,
	parameters: [],
};
