import type { ToolDefinition } from "@workspace/llm-client";

import { rectangleShapeWithHandlerToolDefinition } from "../add_rectangle_shape_with_handler";

/**
 * Tool definition for adding a rectangle shape to the canvas.
 */
export const rectangleShapeToolDefinition: ToolDefinition =
	rectangleShapeWithHandlerToolDefinition;
