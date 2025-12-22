import type { ToolDefinition } from "@workspace/llm-client";

import TOOL_DESCRIPTION from "./prompts/tool-description.md?raw";

/**
 * Tool definition for the workflow agent that helps users create workflows.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const definition: ToolDefinition = {
	name: "workflow_agent",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "user_goal",
			type: "string",
			description:
				"A natural language description of the user's intended workflow (e.g., 'Summarize an uploaded PDF and send it via email.')",
		},
	],
};
