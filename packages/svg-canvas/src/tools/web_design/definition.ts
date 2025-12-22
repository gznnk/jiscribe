import type { ToolDefinition } from "@workspace/llm-client";

import TOOL_DESCRIPTION from "./prompts/tool-description.md?raw";

/**
 * Tool definition for the web design agent that helps users create web page layouts.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const webDesignToolDefinition: ToolDefinition = {
	name: "web_design",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "design_request",
			type: "string",
			description:
				"A natural language description of the desired web page design (e.g., 'Create a modern landing page for a tech startup with header, hero section, and footer.')",
		},
	],
};
