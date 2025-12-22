import type { ToolDefinition } from "@workspace/llm-client";

import { textElementWithHandlerToolDefinition } from "../add_text_element_with_handler";

/**
 * Description text for the append_text_element tool.
 * Explains the purpose and behavior of the text element.
 */
const TOOL_DESCRIPTION = `
Appends a standalone text element to a system-prepared dedicated canvas area at the specified position.
Use for headings, descriptions, labels, and other standalone text content.
Returns a JSON object containing the text element ID, content, and positioning.
`;

/**
 * Tool definition for appending a text element to a system-prepared canvas area.
 */
export const appendTextElementToolDefinition: ToolDefinition = {
	name: "append_text_element",
	description: TOOL_DESCRIPTION,
	parameters: textElementWithHandlerToolDefinition.parameters,
};
