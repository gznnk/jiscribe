import {
	degreesToRadians,
	calcAffineTransformedPoint,
} from "@workspace/geometry";
import { LLMClientFactory, type LLMClient } from "@workspace/llm-client";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	BACKGROUND_COLOR,
	BORDER_COLOR,
	BORDER_WIDTH,
	CORNER_RADIUS,
	MIN_HEIGHT,
	MIN_WIDTH,
} from "../../../constants/styling/nodes/LLMNodeStyling";
import {
	BASE_MARGIN,
	HEADER_HEIGHT,
	HEADER_MARGIN_TOP,
} from "../../../constants/styling/nodes/NodeStyling";
import { useProcessManager } from "../../../hooks/useProcessManager";
import type { DiagramClickEvent } from "../../../types/events/DiagramClickEvent";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { DiagramHoverChangeEvent } from "../../../types/events/DiagramHoverChangeEvent";
import type { DiagramSelectEvent } from "../../../types/events/DiagramSelectEvent";
import type { ExecutionPropagationEvent } from "../../../types/events/ExecutionPropagationEvent";
import type { LLMNodeProps } from "../../../types/props/nodes/LLMNodeProps";
import type { InputState } from "../../../types/state/elements/InputState";
import type { NodeHeaderState } from "../../../types/state/elements/NodeHeaderState";
import { newEventId } from "../../../utils/core/newEventId";
import { isPlainTextPayload } from "../../../utils/execution/isPlainTextPayload";
import { OpenAiKeyManager } from "../../../utils/KeyManager";
import { ProcessIndicator } from "../../auxiliary/ProcessIndicator";
import { Frame } from "../../elements/Frame";
import { Input } from "../../elements/Input";
import { NodeHeader } from "../../elements/NodeHeader";
import { LLM } from "../../icons/LLM";

/**
 * LLMNode component.
 */
const LLMNodeComponent: React.FC<LLMNodeProps> = (props) => {
	const {
		id,
		x,
		y,
		width,
		height,
		scaleX,
		scaleY,
		rotation,
		items,
		isSelected,
		isAncestorSelected,
		minWidth = MIN_WIDTH,
		minHeight = MIN_HEIGHT,
		onDrag,
		onDragOver,
		onDragLeave,
		onSelect,
		onClick,
		onHoverChange,
		onTextChange,
		onExecute,
	} = props;

	const nodeHeaderState = items[0] as NodeHeaderState;
	const inputState = items[1] as InputState;

	const [apiKey, setApiKey] = useState<string>("");
	const [instructions, setInstructions] = useState<string>(inputState.text);
	const [llmClient, setLlmClient] = useState<LLMClient | null>(null);
	const {
		processes,
		hasActiveProcess,
		addProcess,
		setProcessSuccess,
		setProcessError,
	} = useProcessManager();

	// Apply the props.text to the state when the component mounts or when props.text changes.
	useEffect(() => {
		setInstructions(inputState.text);
	}, [inputState.text]);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		id,
		instructions,
		onDrag,
		onSelect,
		onClick,
		onHoverChange,
		onExecute,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Load the API key from local storage and initialize LLM client when the component mounts.
	useEffect(() => {
		const storedApiKey = OpenAiKeyManager.loadKey();
		if (storedApiKey) {
			setApiKey(storedApiKey);
			const client = LLMClientFactory.createClient(storedApiKey, {
				systemPrompt: instructions,
			});
			setLlmClient(client);
		}
	}, [instructions]);

	// Update LLM client when instructions change
	useEffect(() => {
		if (apiKey) {
			const client = LLMClientFactory.createClient(apiKey, {
				systemPrompt: instructions,
			});
			setLlmClient(client);
		}
	}, [apiKey, instructions]);

	// Handler for drag events.
	const handleDrag = useCallback((e: DiagramDragEvent) => {
		const { id, onDrag } = refBus.current;
		onDrag?.({
			...e,
			id,
		});
	}, []);

	// Handler for select events.
	const handleSelect = useCallback((e: DiagramSelectEvent) => {
		const { id, onSelect } = refBus.current;
		onSelect?.({
			...e,
			id,
		});
	}, []);

	// Handler for click events.
	const handleClick = useCallback((e: DiagramClickEvent) => {
		const { id, onClick } = refBus.current;
		onClick?.({
			...e,
			id,
		});
	}, []);

	// Handler for hover change events.
	const handleHoverChange = useCallback((e: DiagramHoverChangeEvent) => {
		const { id, onHoverChange } = refBus.current;
		onHoverChange?.({
			...e,
			id,
		});
	}, []);

	// Handler for executing the LLM with streaming response
	const handleExecution = useCallback(
		async (inputText: string) => {
			if (inputText === "" || !llmClient) return;

			const { id, onExecute } = refBus.current;

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

	// Handle propagation events from child components
	const onPropagation = useCallback(
		(e: ExecutionPropagationEvent) => {
			if (e.eventPhase === "Ended") {
				if (!isPlainTextPayload(e.payload)) return;
				// Handle execution
				const textData = e.payload.data;
				handleExecution(textData);
			}
		},
		[handleExecution],
	);

	const headerCenter = calcAffineTransformedPoint(
		0,
		-(height / 2 - (HEADER_HEIGHT / 2 + HEADER_MARGIN_TOP)),
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<>
			<Frame
				{...props}
				width={width}
				height={height}
				minWidth={minWidth}
				minHeight={minHeight}
				stroke={BORDER_COLOR}
				strokeWidth={BORDER_WIDTH}
				strokeDashType="solid"
				fill={BACKGROUND_COLOR}
				cornerRadius={CORNER_RADIUS}
				onPropagation={onPropagation}
			/>
			<NodeHeader
				{...nodeHeaderState}
				x={headerCenter.x}
				y={headerCenter.y}
				width={width - BASE_MARGIN * 2}
				height={HEADER_HEIGHT}
				scaleX={scaleX}
				scaleY={scaleY}
				rotation={rotation}
				isSelected={isSelected}
				isAncestorSelected={isAncestorSelected}
				icon={LLM}
				iconScale={0.9}
				blinkIcon={hasActiveProcess}
				blinkIconColor="#06b6d4"
				onDrag={handleDrag}
				onSelect={handleSelect}
				onClick={handleClick}
				onHoverChange={handleHoverChange}
				onTextChange={onTextChange}
			/>
			<Input
				{...inputState}
				text={instructions}
				isSelected={isSelected}
				isAncestorSelected={isAncestorSelected}
				showOutline={false}
				isTransforming={false}
				connectType="end-only"
				onDrag={handleDrag}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onSelect={handleSelect}
				onClick={handleClick}
				onTextChange={onTextChange}
			/>
			<ProcessIndicator
				x={x}
				y={y}
				width={width}
				height={height}
				rotation={rotation}
				processes={processes}
			/>
		</>
	);
};

export const LLMNode = memo(LLMNodeComponent);

