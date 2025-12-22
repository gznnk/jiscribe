import type { ToolDefinition } from "@workspace/llm-client";

import { textElementWithHandlerToolDefinition } from "../add_text_element_with_handler";

/**
 * Tool definition for adding a text element to the canvas.
 */
export const textElementToolDefinition: ToolDefinition =
	textElementWithHandlerToolDefinition;
