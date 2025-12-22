import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the group_shapes tool.
 * Explains the purpose and behavior of shape grouping.
 */
const TOOL_DESCRIPTION = `
Groups multiple shapes on the canvas by their IDs into a single group.
The shapes specified by the shapeIds array will be combined into one group, 
allowing them to be moved and manipulated as a single unit.
Returns a JSON object containing the IDs of the grouped shapes and the new group ID.
`;

/**
 * Tool definition for grouping shapes on the canvas.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const groupShapesToolDefinition: ToolDefinition = {
	name: "group_shapes",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "shapeIds",
			type: "array",
			description:
				"Array of shape IDs to be grouped together. Must contain at least 2 shape IDs.",
			items: { type: "string" },
		},
		{
			name: "name",
			type: "string",
			description: "Optional name for the group.",
		},
		{
			name: "description",
			type: "string",
			description: "Optional description for the group.",
		},
	],
};
