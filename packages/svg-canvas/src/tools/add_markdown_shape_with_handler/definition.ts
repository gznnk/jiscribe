import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the add_markdown_shape tool.
 * Explains the purpose and behavior of the markdown shape.
 */
const TOOL_DESCRIPTION = `
Adds a markdown-enabled text box to the canvas at the specified position.
This shape is styled for markdown content with a light background and left-aligned text.
Returns a JSON object containing the shape ID, type, and dimensions.
`;

/**
 * Tool definition for adding a markdown shape to the canvas.
 */
export const markdownShapeWithHandlerToolDefinition: ToolDefinition = {
	name: "add_markdown_shape",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "x",
			type: "number",
			description: "The X coordinate of the center of the markdown box.",
		},
		{
			name: "y",
			type: "number",
			description: "The Y coordinate of the center of the markdown box.",
		},
		{
			name: "width",
			type: "number",
			description: "The width of the markdown box in pixels. Default is 300.",
		},
		{
			name: "height",
			type: "number",
			description: "The height of the markdown box in pixels. Default is 200.",
		},
		{
			name: "text",
			type: "string",
			description:
				"Optional markdown text content to display inside the box. Supports markdown formatting.",
		},
		{
			name: "fill",
			type: "string",
			description:
				"The background color of the markdown box (CSS color format: hex, rgb, named colors). Default is '#fef9e7' (light cream).",
		},
		{
			name: "stroke",
			type: "string",
			description:
				"The border color of the markdown box (CSS color format: hex, rgb, named colors). Default is '#f39c12' (orange).",
		},
		{
			name: "strokeWidth",
			type: "number",
			description: "The width of the border in pixels. Default is 2.",
		},
		{
			name: "name",
			type: "string",
			description: "Optional name for the markdown shape.",
		},
		{
			name: "description",
			type: "string",
			description: "Optional description for the markdown shape.",
		},
	],
};
