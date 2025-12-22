import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the add_circle_shape tool.
 * Explains the purpose and behavior of the circle shape.
 */
const TOOL_DESCRIPTION = `
Adds a circle shape to the canvas at the specified center position.
Returns a JSON object containing the shape ID, type, and dimensions.
`;

/**
 * Tool definition for adding a circle shape to the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const circleShapeWithHandlerToolDefinition: ToolDefinition = {
	name: "add_circle_shape",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "cx",
			type: "number",
			description: "The X coordinate of the center of the circle.",
		},
		{
			name: "cy",
			type: "number",
			description: "The Y coordinate of the center of the circle.",
		},
		{
			name: "r",
			type: "number",
			description: "The radius of the circle in pixels.",
		},
		{
			name: "fill",
			type: "string",
			description:
				"The fill color of the circle (CSS color format: hex, rgb, named colors).",
		},
		{
			name: "stroke",
			type: "string",
			description:
				"The stroke (border) color of the rectangle  (CSS color format: hex, rgb, named colors). Default is 'transparent'.",
		},
		{
			name: "strokeWidth",
			type: "number",
			description: "The width of the stroke in pixels. Default is 1.",
		},
		{
			name: "name",
			type: "string",
			description: "Optional name for the circle shape.",
		},
		{
			name: "description",
			type: "string",
			description: "Optional description for the circle shape.",
		},
	],
};
