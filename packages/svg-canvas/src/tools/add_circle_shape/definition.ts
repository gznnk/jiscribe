import type { ToolDefinition } from "@workspace/llm-client";

import { circleShapeWithHandlerToolDefinition } from "../add_circle_shape_with_handler";

/**
 * Tool definition for adding a circle shape to the canvas.
 */
export const circleShapeToolDefinition: ToolDefinition =
	circleShapeWithHandlerToolDefinition;
