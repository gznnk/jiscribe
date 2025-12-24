import { calcAffineTransformedPoint } from "@workspace/geometry";
import { LLMClientFactory, type LLMClient } from "@workspace/llm-client";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useEventBus } from "../../../context/EventBusContext";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useHover } from "../../../hooks/useHover";
import { useProcessManager } from "../../../hooks/useProcessManager";
import { useSelect } from "../../../hooks/useSelect";
import {
	circleShapeToolDefinition,
	useAddCircleShapeTool,
} from "../../../tools/add_circle_shape";
import {
	rectangleShapeToolDefinition,
	useAddRectangleShapeTool,
} from "../../../tools/add_rectangle_shape";
import {
	textElementToolDefinition,
	useAddTextElementTool,
} from "../../../tools/add_text_element";
import {
	connectShapesToolDefinition,
	useConnectShapesTool,
} from "../../../tools/connect_shapes";
import {
	groupShapesToolDefinition,
	useGroupShapesTool,
} from "../../../tools/group_shapes";
import type { DiagramClickEvent } from "../../../types/events/DiagramClickEvent";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { DiagramSelectEvent } from "../../../types/events/DiagramSelectEvent";
import type { AiProps } from "../../../types/props/diagrams/AiProps";
import type { InputState } from "../../../types/state/elements/InputState";
import { mergeProps } from "../../../utils/core/mergeProps";
import { newEventId } from "../../../utils/core/newEventId";
import { OpenAiKeyManager } from "../../../utils/KeyManager";
import { ProcessIndicator } from "../../auxiliary/ProcessIndicator";
import { IconContainer } from "../../core/IconContainer";
import { Button } from "../../elements/Button";
import { Input } from "../../elements/Input";
import { AiAssistant } from "../../icons/AiAssistant";

/**
 * Ai component - an AI chat diagram element with avatar, speech bubble, and chat input
 */
const AiComponent: React.FC<AiProps> = (props) => {
	const {
		id,
		x,
		y,
		avatarUrl,
		avatarBgColor,
		bubbleBgColor,
		aiMessage,
		items,
		isSelected,
		isAncestorSelected,
		onDrag,
		onSelect,
		onClick,
		onHoverChange,
		onTextChange,
		onExecute,
		onAiMessageChange,
	} = props;

	const inputState = items[0] as InputState;
	const [text, setText] = useState<string>(inputState?.text || "");
	const [currentMessage, setCurrentMessage] = useState<string>(aiMessage);
	const [apiKey, setApiKey] = useState<string>("");
	const [llmClient, setLlmClient] = useState<LLMClient | null>(null);
	const eventBus = useEventBus();

	const { processes, addProcess, setProcessSuccess, setProcessError } =
		useProcessManager();

	// Initialize tool hooks (memoized by eventBus)
	const addRectangleShape = useAddRectangleShapeTool(eventBus);
	const addCircleShape = useAddCircleShapeTool(eventBus);
	const addTextElement = useAddTextElementTool(eventBus);
	const connectShapes = useConnectShapesTool(eventBus);
	const groupShapes = useGroupShapesTool(eventBus);

	// Memoize tool definitions and handlers
	const toolsConfig = useMemo(
		() => ({
			tools: [
				rectangleShapeToolDefinition,
				circleShapeToolDefinition,
				textElementToolDefinition,
				connectShapesToolDefinition,
				groupShapesToolDefinition,
			],
			handlers: {
				add_rectangle_shape: addRectangleShape,
				add_circle_shape: addCircleShape,
				add_text_element: addTextElement,
				connect_shapes: connectShapes,
				group_shapes: groupShapes,
			},
		}),
		[
			addRectangleShape,
			addCircleShape,
			addTextElement,
			connectShapes,
			groupShapes,
		],
	);

	// Create ref for the Avatar circle element
	const groupRef = useRef<SVGCircleElement>(null);

	useEffect(() => {
		setText(inputState?.text || "");
	}, [inputState?.text]);

	useEffect(() => {
		setCurrentMessage(aiMessage);
	}, [aiMessage]);

	// Load API key and initialize LLM client
	useEffect(() => {
		const storedApiKey = OpenAiKeyManager.loadKey();
		if (storedApiKey) {
			setApiKey(storedApiKey);
		}
	}, []);

	// Update LLM client when API key or tools change
	useEffect(() => {
		if (apiKey) {
			const client = LLMClientFactory.createClient(apiKey, {
				systemPrompt:
					"You are a helpful AI assistant with access to canvas manipulation tools. You can add shapes (rectangles and circles), add text elements, connect nodes, and group shapes together.",
				tools: toolsConfig.tools,
				functionHandlers: toolsConfig.handlers,
			});
			setLlmClient(client);
		}
	}, [apiKey, toolsConfig]);

	// Create references to avoid function creation in every render
	const refBusVal = {
		id,
		text,
		onDrag,
		onSelect,
		onClick,
		onHoverChange,
		onTextChange,
		onExecute,
		onAiMessageChange,
		setText,
		setCurrentMessage,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Handler for drag events (for child components)
	const handleChildDrag = useCallback((e: DiagramDragEvent) => {
		const { id, onDrag } = refBus.current;
		onDrag?.({
			...e,
			id,
		});
	}, []);

	// Handler for select events (for child components)
	const handleChildSelect = useCallback((e: DiagramSelectEvent) => {
		const { id, onSelect } = refBus.current;
		onSelect?.({
			...e,
			id,
		});
	}, []);

	// Handler for click events (for child components)
	const handleChildClick = useCallback((e: DiagramClickEvent) => {
		const { id, onClick } = refBus.current;
		onClick?.({
			...e,
			id,
		});
	}, []);

	// Use interaction hooks
	const dragProps = useDrag({
		id,
		x,
		y,
		ref: groupRef as React.RefObject<SVGElement>,
		onDrag,
	});

	const clickProps = useClick({
		id,
		x,
		y,
		ref: groupRef as React.RefObject<SVGElement>,
		onClick,
	});

	const selectProps = useSelect({
		id,
		onSelect,
	});

	const hoverProps = useHover({
		id,
		onHoverChange,
	});

	// Compose props for the SVG element
	const composedProps = mergeProps(
		dragProps,
		clickProps,
		selectProps,
		hoverProps,
	);

	// Handler for executing the LLM with streaming response
	const handleExecution = useCallback(
		async (inputText: string) => {
			if (inputText === "" || !llmClient) return;

			const { id, onExecute, onAiMessageChange, setCurrentMessage } =
				refBus.current;

			const processId = newEventId();
			addProcess(processId);

			try {
				let fullOutput = "";
				const eventId = newEventId();

				onExecute?.({
					id,
					eventId,
					eventPhase: "Started",
					payload: {
						format: "text",
						data: "",
						metadata: {
							contentType: "plain",
						},
					},
				});

				// Use LLMClient's chat method with streaming callback
				await llmClient.chat({
					message: inputText,
					onTextChunk: (textChunk: string) => {
						fullOutput += textChunk;
						setCurrentMessage(fullOutput);

						onExecute?.({
							id,
							eventId,
							eventPhase: "InProgress",
							payload: {
								format: "text",
								data: fullOutput,
								metadata: {
									contentType: "plain",
								},
							},
						});
					},
				});

				// Update the AI message state
				onAiMessageChange?.({
					id,
					eventId,
					eventPhase: "Ended",
					aiMessage: fullOutput,
				});

				// Send completion event
				onExecute?.({
					id,
					eventId,
					eventPhase: "Ended",
					payload: {
						format: "text",
						data: fullOutput,
						metadata: {
							contentType: "plain",
						},
					},
				});

				setProcessSuccess(processId);
			} catch (error) {
				console.error("Error fetching data from LLM API:", error);
				alert("An error occurred during the API request.");
				setProcessError(processId);
			}
		},
		[llmClient, addProcess, setProcessError, setProcessSuccess],
	);

	// Handler for send button click
	const handleSendClick = useCallback(() => {
		const { text } = refBus.current;
		if (text.trim() === "") return;
		handleExecution(text);
	}, [handleExecution]);

	// Layout constants
	const avatarSize = 80;
	const buttonWidth = 60;
	const buttonHeight = 36;
	const inputHeight = 40;
	const bubblePadding = 15;
	const avatarOverlap = 30; // How much avatar overlaps below the bubble

	// Bubble and input dimensions (fixed, not dependent on component size)
	const bubbleWidth = 300;
	const bubbleHeight = 200;
	const inputWidth = bubbleWidth - buttonWidth - 5; // 5px gap between input and button

	// Avatar position (center of component)
	const avatarY = 0;

	// Check if processing
	const isProcessing = processes.length > 0;

	// Speech bubble position (above avatar)
	const bubbleY = -(avatarSize / 2 + bubbleHeight / 2 - avatarOverlap);

	// Input position (below avatar, absolute positioning)
	const inputY = avatarSize / 2 + inputHeight / 2 + 5;
	const inputCenter = calcAffineTransformedPoint(
		-(buttonWidth / 2 + 2.5), // Shift left to make room for button
		inputY,
		1, // scaleX fixed at 1
		1, // scaleY fixed at 1
		0, // rotation fixed at 0
		x,
		y,
	);

	// Send button position (below avatar, right side, absolute positioning)
	const buttonCenter = calcAffineTransformedPoint(
		bubbleWidth / 2 - buttonWidth / 2,
		inputY,
		1, // scaleX fixed at 1
		1, // scaleY fixed at 1
		0, // rotation fixed at 0
		x,
		y,
	);

	// Calculate positions for bubble
	const bubbleLeft = -bubbleWidth / 2;
	const bubbleTop = bubbleY - bubbleHeight / 2 - 36;

	return (
		<>
			{/* Main bubble rectangle */}
			<rect
				x={x + bubbleLeft}
				y={y + bubbleTop}
				width={bubbleWidth}
				height={bubbleHeight}
				rx="10"
				ry="10"
				fill={bubbleBgColor}
				stroke="#ccc"
				strokeWidth="1"
				pointerEvents="none"
			/>

			{/* Bubble content */}
			<foreignObject
				x={x + bubbleLeft + bubblePadding}
				y={y + bubbleTop + bubblePadding}
				width={bubbleWidth - bubblePadding * 2}
				height={bubbleHeight - bubblePadding * 2}
				pointerEvents="none"
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						overflow: "auto",
						fontSize: "14px",
						color: "#333",
						fontFamily: "Arial, sans-serif",
						whiteSpace: "pre-wrap",
						wordWrap: "break-word",
						userSelect: "none",
					}}
				>
					{currentMessage}
				</div>
			</foreignObject>

			{/* Avatar circle */}
			<circle
				ref={groupRef}
				id={id}
				cx={x}
				cy={y + avatarY}
				r={avatarSize / 2}
				fill={avatarBgColor}
				tabIndex={0}
				{...composedProps}
			/>

			{/* Avatar image or icon */}
			{avatarUrl ? (
				<g>
					<image
						href={avatarUrl}
						x={x - avatarSize / 2}
						y={y + avatarY - avatarSize / 2}
						width={avatarSize}
						height={avatarSize}
						clipPath={`circle(${avatarSize / 2}px at center)`}
						pointerEvents="none"
					>
						{isProcessing && (
							<animateTransform
								attributeName="transform"
								attributeType="XML"
								type="rotate"
								from={`-5 ${x} ${y + avatarY}`}
								to={`5 ${x} ${y + avatarY}`}
								dur="0.3s"
								repeatCount="indefinite"
								calcMode="spline"
								keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
								keyTimes="0; 0.5; 1"
								values={`-5 ${x} ${y + avatarY}; 5 ${x} ${y + avatarY}; -5 ${x} ${y + avatarY}`}
							/>
						)}
					</image>
				</g>
			) : (
				<IconContainer
					x={x}
					y={y}
					width={avatarSize}
					height={avatarSize}
					rotation={0}
					scaleX={1}
					scaleY={1}
					pointerEvents="none"
				>
					<AiAssistant
						width={avatarSize}
						height={avatarSize}
						animation={true}
					/>
				</IconContainer>
			)}
			<ProcessIndicator
				x={x}
				y={y}
				width={avatarSize}
				height={avatarSize}
				rotation={0}
				processes={processes}
			/>
			{inputState && (
				<Input
					{...inputState}
					x={inputCenter.x}
					y={inputCenter.y}
					width={inputWidth}
					height={inputHeight}
					scaleX={1}
					scaleY={1}
					rotation={0}
					text={text}
					isSelected={isSelected}
					isAncestorSelected={isAncestorSelected}
					rotateEnabled={false}
					showOutline={false}
					isTransforming={false}
					onDrag={handleChildDrag}
					onSelect={handleChildSelect}
					onClick={handleChildClick}
					onTextChange={onTextChange}
				/>
			)}
			<Button
				id={`${id}-send-button`}
				x={buttonCenter.x}
				y={buttonCenter.y}
				width={buttonWidth}
				height={buttonHeight}
				scaleX={1}
				scaleY={1}
				rotation={0}
				keepProportion={false}
				rotateEnabled={false}
				inversionEnabled={false}
				strokeDashType="solid"
				isSelected={false}
				isAncestorSelected={false}
				isRootSelected={false}
				showConnectPoints={false}
				connectEnabled={false}
				showOutline={false}
				outlineDisabled={false}
				isTransforming={false}
				text="Send"
				isTextEditing={false}
				effectsEnabled
				onDrag={handleChildDrag}
				onClick={handleSendClick}
			/>
		</>
	);
};

export const Ai = memo(AiComponent);

