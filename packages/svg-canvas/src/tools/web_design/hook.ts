import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { LLMClientFactory  } from "@workspace/llm-client";
import { useMemo } from "react";

import WEB_DESIGN_INSTRUCTIONS from "./prompts/instructions.md?raw";
import { OpenAiKeyManager } from "../../utils/KeyManager";
import type { Diagram } from "../../types/state/core/Diagram";
import {
	circleShapeWithHandlerToolDefinition,
	useAddCircleShapeWithHandlerTool,
} from "../add_circle_shape_with_handler";
import {
	rectangleShapeWithHandlerToolDefinition,
	useAddRectangleShapeWithHandlerTool,
} from "../add_rectangle_shape_with_handler";
import {
	textElementWithHandlerToolDefinition,
	useAddTextElementWithHandlerTool,
} from "../add_text_element_with_handler";
import {
	groupShapesWithHandlerToolDefinition,
	useGroupShapesWithHandlerTool,
} from "../group_shapes_with_handler";
import {
	resizeCanvasFrameWithHandlerToolDefinition,
	useResizeCanvasFrameWithHandlerTool,
	type ResizeCanvasFrameResult,
} from "../resize_canvas_frame_with_handler";

// TODO: 整理
type ShapeHandler = (diagram: Diagram) => void;
type GroupShapesResult = {
	shapeIds: string[];
	groupId: string;
	name?: string;
	description?: string;
};
type GroupShapesHandler = (result: GroupShapesResult) => void;
type ResizeCanvasFrameHandler = (result: ResizeCanvasFrameResult) => void;

export const useWebDesignTool = (): ((
	shapeHandler: ShapeHandler,
	groupShapesHandler: GroupShapesHandler,
	resizeCanvasFrameHandler: ResizeCanvasFrameHandler,
) => FunctionCallHandler) => {
	// 各_with_handlerツールを取得
	const rectangleShapeWithHandlerTool = useAddRectangleShapeWithHandlerTool();
	const circleShapeWithHandlerTool = useAddCircleShapeWithHandlerTool();
	const textElementWithHandlerTool = useAddTextElementWithHandlerTool();
	const groupShapesWithHandlerTool = useGroupShapesWithHandlerTool();
	const resizeCanvasFrameWithHandlerTool =
		useResizeCanvasFrameWithHandlerTool();

	// handler本体をuseMemoで生成
	return useMemo<
		(
			shapeHandler: ShapeHandler,
			groupShapesHandler: GroupShapesHandler,
			resizeCanvasFrameHandler: ResizeCanvasFrameHandler,
		) => FunctionCallHandler
	>(() => {
		return (
			shapeHandler: ShapeHandler,
			groupShapesHandler: GroupShapesHandler,
			resizeCanvasFrameHandler: ResizeCanvasFrameHandler,
		) => {
			const WEB_DESIGN_TOOLS = [
				rectangleShapeWithHandlerToolDefinition,
				circleShapeWithHandlerToolDefinition,
				textElementWithHandlerToolDefinition,
				groupShapesWithHandlerToolDefinition,
				resizeCanvasFrameWithHandlerToolDefinition,
			];

			const functionHandlerMap = {
				add_rectangle_shape: rectangleShapeWithHandlerTool(shapeHandler),
				add_circle_shape: circleShapeWithHandlerTool(shapeHandler),
				add_text_element: textElementWithHandlerTool(shapeHandler),
				group_shapes: groupShapesWithHandlerTool(groupShapesHandler),
				resize_canvas_frame: resizeCanvasFrameWithHandlerTool(
					resizeCanvasFrameHandler,
				),
			};

			const handler: FunctionCallHandler = async (
				functionCall: FunctionCallInfo,
			) => {
				const args = functionCall.arguments as { design_request: string };
				if (typeof args.design_request === "string") {
					const storedApiKey = OpenAiKeyManager.loadKey();
					if (!storedApiKey)
						return { success: false, content: "API key not found." };

					let outputContent = "";
					try {
						const llmClient = LLMClientFactory.createClient(storedApiKey, {
							tools: WEB_DESIGN_TOOLS,
							systemPrompt: WEB_DESIGN_INSTRUCTIONS,
							functionHandlers: functionHandlerMap,
							maxAttempts: 500,
						});

						const userMessage = `${args.design_request}\n\nCreate the web page design using the available tools. Start with background elements and work your way up to text elements for proper layering.`;

						await llmClient.chat({
							message: userMessage,
							onTextChunk: (textChunk: string) => {
								outputContent += textChunk;
							},
						});

						return {
							success: true,
							content: outputContent || "Web design creation completed.",
						};
					} catch (error) {
						console.error("Error in web design agent:", error);
						return {
							success: false,
							content: "Error creating web design.",
						};
					}
				}
				return {
					success: false,
					content: "Invalid arguments: design_request is required.",
				};
			};
			return handler;
		};
	}, [
		rectangleShapeWithHandlerTool,
		circleShapeWithHandlerTool,
		textElementWithHandlerTool,
		groupShapesWithHandlerTool,
		resizeCanvasFrameWithHandlerTool,
	]);
};
