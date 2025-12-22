import type { ToolDefinition } from "@workspace/llm-client";

import { circleShapeWithHandlerToolDefinition } from "../add_circle_shape_with_handler";

/**
 * Description text for the append_circle_shape tool.
 * Explains the purpose and behavior of the circle shape.
 */
const TOOL_DESCRIPTION = `
Appends a circle shape to a system-prepared dedicated canvas area at the specified center position.
Returns a JSON object containing the shape ID, type, and dimensions.
`;

/**
 * Tool definition for appending a circle shape to a system-prepared canvas area.
 */
export const appendCircleShapeToolDefinition: ToolDefinition = {
	name: "append_circle_shape",
	description: TOOL_DESCRIPTION,
	parameters: circleShapeWithHandlerToolDefinition.parameters,
};
