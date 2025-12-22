import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the resize_canvas_frame tool.
 * Explains the purpose and behavior of resizing a canvas frame.
 */
const TOOL_DESCRIPTION = `
Resizes the canvas frame to the specified dimensions.
This tool adjusts the canvas size to fit the web design content.
Returns a JSON object containing the new dimensions.
`;

/**
 * Tool definition for resizing a canvas frame.
 */
export const resizeCanvasFrameWithHandlerToolDefinition: ToolDefinition = {
	name: "resize_canvas_frame",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "width",
			type: "number",
			description: "The new width of the canvas frame in pixels.",
		},
		{
			name: "height",
			type: "number",
			description: "The new height of the canvas frame in pixels.",
		},
	],
};
