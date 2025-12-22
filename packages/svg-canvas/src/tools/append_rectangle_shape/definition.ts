import type { ToolDefinition } from "@workspace/llm-client";

import { rectangleShapeWithHandlerToolDefinition } from "../add_rectangle_shape_with_handler";

/**
 * Description text for the append_rectangle_shape tool.
 * Explains the purpose and behavior of the rectangle shape.
 */
const TOOL_DESCRIPTION = `
Appends a rectangle shape to a system-prepared dedicated canvas area at the specified position with optional text content.
Returns a JSON object containing the shape ID, type, and dimensions.
`;

/**
 * Tool definition for appending a rectangle shape to a system-prepared canvas area.
 */
export const appendRectangleShapeToolDefinition: ToolDefinition = {
	name: "append_rectangle_shape",
	description: TOOL_DESCRIPTION,
	parameters: rectangleShapeWithHandlerToolDefinition.parameters,
};
