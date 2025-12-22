import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the add_html_preview tool.
 * Explains the purpose and behavior of the HTML preview shape.
 */
const TOOL_DESCRIPTION = `
Adds an HTML preview shape to the canvas.
An HTML preview shape displays HTML content inside a foreignObject element with DOMPurify sanitization for security.
You can specify the HTML content, position, and dimensions.
The HTML content will be rendered inside a div element and can include any valid HTML markup (sanitized for security).
Returns a JSON object containing the shape ID, type, and dimensions (width and height).
`;

/**
 * Tool definition for adding an HTML preview shape to the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const htmlPreviewToolDefinition: ToolDefinition = {
	name: "add_html_preview",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "x",
			type: "number",
			description:
				"The X coordinate of the center of the HTML preview shape on the canvas.",
		},
		{
			name: "y",
			type: "number",
			description:
				"The Y coordinate of the center of the HTML preview shape on the canvas.",
		},
		{
			name: "htmlContent",
			type: "string",
			description:
				"The HTML markup content to display. Should be valid HTML (e.g., '<h1>Hello</h1><p>World</p>', '<div style=\"color: red;\">Styled text</div>'). The content will be automatically sanitized with DOMPurify for security.",
		},
		{
			name: "width",
			type: "number",
			description:
				"The width of the HTML preview shape in pixels. Default is 300.",
		},
		{
			name: "height",
			type: "number",
			description:
				"The height of the HTML preview shape in pixels. Default is 200.",
		},
		{
			name: "rotation",
			type: "number",
			description:
				"The rotation angle of the HTML preview shape in degrees. Default is 0.",
		},
		{
			name: "scaleX",
			type: "number",
			description:
				"The horizontal scale factor of the HTML preview shape. Default is 1.",
		},
		{
			name: "scaleY",
			type: "number",
			description:
				"The vertical scale factor of the HTML preview shape. Default is 1.",
		},
	],
};
