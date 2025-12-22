import type { ToolDefinition } from "@workspace/llm-client";

import { markdownShapeWithHandlerToolDefinition } from "../add_markdown_shape_with_handler";

/**
 * Tool definition for adding a markdown shape to the canvas.
 */
export const markdownShapeToolDefinition: ToolDefinition =
	markdownShapeWithHandlerToolDefinition;
