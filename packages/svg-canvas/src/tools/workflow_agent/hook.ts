
import type { EventBus } from "@workspace/event-bus";
import { LLMClientFactory } from "@workspace/llm-client";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useMemo } from "react";

import { OpenAiKeyManager } from "../../utils/KeyManager";
import {
	imageGenToolDefinition,
	useAddImageGenNodeTool,
} from "../add_image_gen_node";
import { llmToolDefinition, useAddLLMNodeTool } from "../add_llm_node";
import {
	svgToCanvasToolDefinition,
	useAddSvgToCanvasNodeTool,
} from "../add_svg_to_canvas_node";
import { textNodeToolDefinition, useAddTextNodeTool } from "../add_text_node";
import {
	connectShapesToolDefinition,
	useConnectShapesTool,
} from "../connect_shapes";
import { groupShapesToolDefinition } from "../group_shapes/definition";
import { useGroupShapesTool } from "../group_shapes/hook";
import AI_AGENT_INSTRUCTIONS from "./prompts/agent-instructions.md?raw";

/**
 * Workflow agent handler function (hook版)
 * 必要な依存を受け取り、FunctionCallHandlerを返す
 */
export const useWorkflowAgentHandler = (
	eventBus: EventBus,
): FunctionCallHandler => {
	// 各ツールのhandlerをhookで生成
	const addImageGenNodeHandler = useAddImageGenNodeTool(eventBus);
	const addLLMNodeHandler = useAddLLMNodeTool(eventBus);
	const addTextNodeHandler = useAddTextNodeTool(eventBus);
	const addSvgToCanvasNodeHandler = useAddSvgToCanvasNodeTool(eventBus);
	const connectShapesHandler = useConnectShapesTool(eventBus);
	const groupShapesHandler = useGroupShapesTool(eventBus);

	// handler本体はuseMemoで生成
	return useMemo<FunctionCallHandler>(() => {
		const AI_TOOLS = [
			imageGenToolDefinition,
			llmToolDefinition,
			textNodeToolDefinition,
			svgToCanvasToolDefinition,
			connectShapesToolDefinition,
			groupShapesToolDefinition,
		];
		const functionHandlerMap = {
			add_image_gen_node: addImageGenNodeHandler,
			add_llm_node: addLLMNodeHandler,
			add_text_node: addTextNodeHandler,
			add_svg_to_canvas_node: addSvgToCanvasNodeHandler,
			connect_shapes: connectShapesHandler,
			group_shapes: groupShapesHandler,
		};
		const handler: FunctionCallHandler = async (
			functionCall: FunctionCallInfo,
		) => {
			const args = functionCall.arguments as { user_goal: string };
			if (typeof args.user_goal === "string") {
				const storedApiKey = OpenAiKeyManager.loadKey();
				if (!storedApiKey)
					return { success: false, content: "API key not found." };
				let outputContent = "";
				try {
					const llmClient = LLMClientFactory.createClient(storedApiKey, {
						tools: AI_TOOLS,
						systemPrompt: AI_AGENT_INSTRUCTIONS,
						functionHandlers: functionHandlerMap,
					});
					const userMessage = `${args.user_goal}\n\nStart placing the first node near (X: ${300}, Y: ${200}) on the canvas.`;
					await llmClient.chat({
						message: userMessage,
						onTextChunk: (textChunk) => {
							outputContent += textChunk;
						},
					});
					return {
						success: true,
						content: outputContent || "Workflow generation completed.",
					};
				} catch (error) {
					console.error("Error in workflow agent:", error);
					return {
						success: false,
						content: "Error generating workflow.",
					};
				}
			}
			return {
				success: false,
				content: "Invalid arguments: user_goal is required.",
			};
		};
		return handler;
	}, [
		addImageGenNodeHandler,
		addLLMNodeHandler,
		addTextNodeHandler,
		addSvgToCanvasNodeHandler,
		connectShapesHandler,
		groupShapesHandler,
	]);
};
