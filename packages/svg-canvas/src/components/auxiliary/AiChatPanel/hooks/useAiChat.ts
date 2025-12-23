import type { Message } from "@workspace/llm-chat-ui";
import { LLMClientFactory, type LLMClient } from "@workspace/llm-client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useEventBus } from "../../../../context/EventBusContext";
import {
	circleShapeToolDefinition,
	useAddCircleShapeTool,
} from "../../../../tools/add_circle_shape";
import {
	htmlPreviewToolDefinition,
	useAddHtmlPreviewTool,
} from "../../../../tools/add_html_preview";
import {
	markdownShapeToolDefinition,
	useAddMarkdownShapeTool,
} from "../../../../tools/add_markdown_shape";
import {
	pathShapeToolDefinition,
	useAddPathShapeTool,
} from "../../../../tools/add_path_shape";
import {
	rectangleShapeToolDefinition,
	useAddRectangleShapeTool,
} from "../../../../tools/add_rectangle_shape";
import {
	svgShapeToolDefinition,
	useAddSvgShapeTool,
} from "../../../../tools/add_svg_shape";
import {
	textElementToolDefinition,
	useAddTextElementTool,
} from "../../../../tools/add_text_element";
import {
	connectShapesToolDefinition,
	useConnectShapesTool,
} from "../../../../tools/connect_shapes";
import {
	selectedShapesToolDefinition,
	useGetSelectedShapesTool,
} from "../../../../tools/get_selected_shapes";
import {
	shapesInfoToolDefinition,
	useGetShapesInfoTool,
} from "../../../../tools/get_shapes_info";
import {
	groupShapesToolDefinition,
	useGroupShapesTool,
} from "../../../../tools/group_shapes";
import {
	updateDiagramToolDefinition,
	useUpdateDiagramTool,
} from "../../../../tools/update_diagram";
import {
	GeminiKeyManager,
	OpenAiKeyManager,
} from "../../../../utils/KeyManager";

const USE_GEMINI = true;

/**
 * Custom hook for managing AI chat functionality using llm-client.
 * Handles LLM client initialization, message management, streaming responses, and canvas tools.
 *
 * @returns Object containing chat state and handlers
 */
export const useAiChat = () => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [apiKey, setApiKey] = useState<string>("");
	const [llmClient, setLlmClient] = useState<LLMClient | null>(null);
	const eventBus = useEventBus();

	// Initialize tool hooks
	const addRectangleShape = useAddRectangleShapeTool(eventBus);
	const addCircleShape = useAddCircleShapeTool(eventBus);
	const addTextElement = useAddTextElementTool(eventBus);
	const addPathShape = useAddPathShapeTool(eventBus);
	const addSvgShape = useAddSvgShapeTool(eventBus);
	const addHtmlPreview = useAddHtmlPreviewTool(eventBus);
	const connectShapes = useConnectShapesTool(eventBus);
	const groupShapes = useGroupShapesTool(eventBus);
	const addMarkdownShape = useAddMarkdownShapeTool(eventBus);
	const getShapesInfo = useGetShapesInfoTool(eventBus);
	const getSelectedShapes = useGetSelectedShapesTool(eventBus);
	const updateDiagram = useUpdateDiagramTool(eventBus);

	// Memoize tool definitions and handlers
	const toolsConfig = useMemo(
		() => ({
			tools: [
				rectangleShapeToolDefinition,
				circleShapeToolDefinition,
				textElementToolDefinition,
				pathShapeToolDefinition,
				svgShapeToolDefinition,
				htmlPreviewToolDefinition,
				connectShapesToolDefinition,
				groupShapesToolDefinition,
				markdownShapeToolDefinition,
				shapesInfoToolDefinition,
				selectedShapesToolDefinition,
				updateDiagramToolDefinition,
			],
			handlers: {
				add_rectangle_shape: addRectangleShape,
				add_circle_shape: addCircleShape,
				add_text_element: addTextElement,
				add_path_shape: addPathShape,
				add_svg_shape: addSvgShape,
				add_html_preview: addHtmlPreview,
				connect_shapes: connectShapes,
				group_shapes: groupShapes,
				add_markdown_shape: addMarkdownShape,
				get_shapes_info: getShapesInfo,
				get_selected_shapes: getSelectedShapes,
				update_diagram: updateDiagram,
			},
		}),
		[
			addRectangleShape,
			addCircleShape,
			addTextElement,
			addPathShape,
			addSvgShape,
			addHtmlPreview,
			connectShapes,
			groupShapes,
			addMarkdownShape,
			getShapesInfo,
			getSelectedShapes,
			updateDiagram,
		],
	);

	// Load API key on mount
	useEffect(() => {
		const storedApiKey = USE_GEMINI
			? GeminiKeyManager.loadKey()
			: OpenAiKeyManager.loadKey();
		if (storedApiKey) {
			setApiKey(storedApiKey);
		}
	}, []);

	// Initialize LLM client when API key or tools change
	useEffect(() => {
		if (apiKey) {
			const options = {
				systemPrompt:
					"You are a helpful AI assistant with access to canvas manipulation tools. You can add shapes (rectangles, circles, paths, and custom SVG shapes), add text elements, add HTML preview boxes with sanitized HTML content, add markdown-enabled text boxes, connect shapes with fully customizable styles, group shapes together, retrieve information about existing shapes on the canvas, get detailed information about selected shapes, and update properties of existing diagrams. When users ask you to create or modify canvas elements, use the appropriate tools to help them. Use the add_path_shape tool to create custom lines and paths that can be edited. Use the add_svg_shape tool to add custom SVG graphics defined by SVG markup. Use the add_html_preview tool to add HTML content that will be rendered and displayed (with DOMPurify sanitization for security). Use the connect_shapes tool to connect any shapes with custom arrow heads (FilledTriangle, ConcaveTriangle, OpenArrow, HollowTriangle, FilledDiamond, HollowDiamond, Circle, None), line styles (solid, dashed, dotted), path types (Linear, Bezier, Rounded), and specific anchor positions (topLeftPoint, topCenterPoint, topRightPoint, leftCenterPoint, rightCenterPoint, bottomLeftPoint, bottomCenterPoint, bottomRightPoint). Use the update_diagram tool to modify existing shapes' properties such as position, size, colors, text, and other visual attributes.",
				tools: toolsConfig.tools,
				functionHandlers: toolsConfig.handlers,
			};

			const client = USE_GEMINI
				? LLMClientFactory.createGeminiClient(apiKey, options)
				: LLMClientFactory.createClient(apiKey, options);
			setLlmClient(client);
		}
	}, [apiKey, toolsConfig]);

	/**
	 * Send a message to the AI and handle streaming response
	 */
	const sendMessage = useCallback(
		async (messageContent: string) => {
			if (!messageContent.trim() || !llmClient || isLoading) {
				return;
			}

			// Add user message
			const userMessage: Message = {
				content: messageContent,
				role: "user",
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, userMessage]);

			// Start loading
			setIsLoading(true);

			try {
				let fullResponse = "";

				// Create assistant message placeholder
				const assistantMessage: Message = {
					content: "",
					role: "assistant",
					timestamp: new Date(),
				};
				setMessages((prev) => [...prev, assistantMessage]);

				// Use LLM client's chat method with streaming
				await llmClient.chat({
					message: messageContent,
					onTextChunk: (textChunk: string) => {
						fullResponse += textChunk;

						// Update the last message (assistant's response) with accumulated text
						setMessages((prev) => {
							const newMessages = [...prev];
							if (newMessages.length > 0) {
								const lastMessage = newMessages[newMessages.length - 1];
								if (lastMessage.role === "assistant") {
									lastMessage.content = fullResponse;
								}
							}
							return newMessages;
						});
					},
				});
			} catch (error) {
				console.error("Error sending message to AI:", error);

				// Add error message
				const errorMessage: Message = {
					content: `Error: ${error instanceof Error ? error.message : "Failed to get response from AI"}`,
					role: "assistant",
					timestamp: new Date(),
				};
				setMessages((prev) => [...prev, errorMessage]);
			} finally {
				setIsLoading(false);
			}
		},
		[llmClient, isLoading],
	);

	/**
	 * Clear all messages
	 */
	const clearMessages = useCallback(() => {
		setMessages([]);
		llmClient?.clearConversation();
	}, [llmClient]);

	return {
		messages,
		isLoading,
		hasApiKey: !!apiKey,
		sendMessage,
		clearMessages,
	};
};
