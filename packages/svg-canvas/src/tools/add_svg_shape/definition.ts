import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the add_svg_shape tool.
 * Explains the purpose and behavior of the SVG shape.
 */
const TOOL_DESCRIPTION = `
Adds an SVG shape to the canvas.
An SVG shape is a custom graphic element defined by SVG markup text.
You can specify the SVG markup text, position, and dimensions.
The SVG content should be a valid SVG element or group of elements.
Returns a JSON object containing the shape ID, type, and dimensions (width and height).
`;

/**
 * Tool definition for adding an SVG shape to the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const svgShapeToolDefinition: ToolDefinition = {
	name: "add_svg_shape",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "x",
			type: "number",
			description:
				"The X coordinate of the center of the SVG shape on the canvas.",
		},
		{
			name: "y",
			type: "number",
			description:
				"The Y coordinate of the center of the SVG shape on the canvas.",
		},
		{
			name: "svgText",
			type: "string",
			description:
				'The SVG markup text defining the shape. Should be valid SVG content (e.g., \'<circle cx="50" cy="50" r="40" fill="red" />\', \'<path d="M10 10 L90 90" stroke="black" />\'). The SVG should use relative coordinates within its viewBox.',
		},
		{
			name: "width",
			type: "number",
			description: "The width of the SVG shape in pixels. Default is 100.",
		},
		{
			name: "height",
			type: "number",
			description: "The height of the SVG shape in pixels. Default is 100.",
		},
		{
			name: "rotation",
			type: "number",
			description:
				"The rotation angle of the SVG shape in degrees. Default is 0.",
		},
		{
			name: "scaleX",
			type: "number",
			description:
				"The horizontal scale factor of the SVG shape. Default is 1.",
		},
		{
			name: "scaleY",
			type: "number",
			description: "The vertical scale factor of the SVG shape. Default is 1.",
		},
		{
			name: "keepProportion",
			type: "boolean",
			description:
				"Whether to maintain the aspect ratio when resizing. Default is false.",
		},
	],
};
