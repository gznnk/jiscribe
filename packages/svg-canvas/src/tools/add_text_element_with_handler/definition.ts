import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the add_text_element tool.
 * Explains the purpose and behavior of the text element.
 */
const TOOL_DESCRIPTION = `
Adds a standalone text element to the canvas at the specified position.
Use for headings, descriptions, labels, and other standalone text content.
Returns a JSON object containing the text element ID, content, and positioning.
`;

/**
 * Tool definition for adding a text element to the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const textElementWithHandlerToolDefinition: ToolDefinition = {
	name: "add_text_element",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "x",
			type: "number",
			description: "The X coordinate of the center of the text element.",
		},
		{
			name: "y",
			type: "number",
			description: "The Y coordinate of the center of the text element.",
		},
		{
			name: "width",
			type: "number",
			description: "The width of the text element in pixels.",
		},
		{
			name: "height",
			type: "number",
			description: "The height of the text element in pixels.",
		},
		{
			name: "text",
			type: "string",
			description: "The text content to display.",
		},
		{
			name: "fontSize",
			type: "number",
			description: "Font size of the text in pixels.",
		},
		{
			name: "fill",
			type: "string",
			description:
				"Color of the text (CSS color format: hex, rgb, named colors).",
		},
		{
			name: "fontFamily",
			type: "string",
			description: "Font family for the text. Default is 'Noto Sans JP'.",
		},
		{
			name: "textAlign",
			type: "string",
			description:
				"Horizontal text alignment within the rectangle. Default is 'center'.",
			enum: ["left", "center", "right"],
		},
		{
			name: "verticalAlign",
			type: "string",
			description:
				"Vertical text alignment within the rectangle. Default is 'center'.",
			enum: ["top", "center", "bottom"],
		},
		{
			name: "name",
			type: "string",
			description: "Optional name for the text element.",
		},
		{
			name: "description",
			type: "string",
			description: "Optional description for the text element.",
		},
	],
};
