import { LLMClientFactory } from "@workspace/llm-client";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	BACKGROUND_COLOR,
	BORDER_COLOR,
	BORDER_WIDTH,
	BUTTON_HEIGHT,
	BUTTON_MARGIN_BOTTOM,
	BUTTON_WIDTH,
	CORNER_RADIUS,
} from "../../../constants/styling/nodes/HtmlGenNodeStyling";
import { BASE_MARGIN } from "../../../constants/styling/nodes/NodeStyling";
import { useSvgCanvasState } from "../../../context/SvgCanvasStateContext";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { ExecutionPropagationEvent } from "../../../types/events/ExecutionPropagationEvent";
import type { HtmlGenNodeProps } from "../../../types/props/nodes/HtmlGenNodeProps";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { newEventId } from "../../../utils/core/newEventId";
import { previewHtmlWithConfirm } from "../../../utils/core/previewHtmlWithConfirm";
import { OpenAiKeyManager } from "../../../utils/KeyManager";
import { Button } from "../../elements/Button";
import { Frame } from "../../elements/Frame";

/**
 * HtmlGenNode component.
 */
const HtmlGenNodeComponent: React.FC<HtmlGenNodeProps> = (props) => {
	const { id, width, height, onDrag, onExecute } = props;

	const target = "7247c834-bf96-40bf-afae-ca74907cc13d";

	const [apiKey, setApiKey] = useState<string>("");
	const [processIdList, setProcessIdList] = useState<string[]>([]);
	const canvasRef = useSvgCanvasState();

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		id,
		onDrag,
		onExecute,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Load the API key from local storage when the component mounts.
	useEffect(() => {
		const storedApiKey = OpenAiKeyManager.loadKey();
		if (storedApiKey) {
			setApiKey(storedApiKey);
		}
	}, []);

	// Handler for drag events.
	const handleDrag = useCallback((e: DiagramDragEvent) => {
		const { id, onDrag } = refBus.current;
		onDrag?.({
			...e,
			id,
		});
	}, []);

	// Handler for executing HTML generation
	const handleExecution = useCallback(
		async (data?: unknown) => {
			const {
				id,
				// connectedDiagrams,
				onExecute,
			} = refBus.current;

			// Use propagated data if available, otherwise fallback to target diagram
			let diagramData: string;
			if (data !== undefined) {
				diagramData = JSON.stringify(data, null, 2);
			} else {
				const targetd = getDiagramById(canvasRef.current.items, target);
				diagramData = JSON.stringify(targetd);
			}

			const processId = newEventId();
			setProcessIdList((prev) => [...prev, processId]);

			try {
				// Create LLM client using the factory
				const client = LLMClientFactory.createClient(apiKey);

				const systemPrompt = `You are an HTML generation assistant. Based on the provided diagram data, generate clean, modern HTML code. The HTML should be complete, well-structured, and include appropriate CSS styling.

Connected Diagram Data:
${diagramData}

Please generate a complete HTML document that represents or visualizes the diagram data.`;

				const eventId = newEventId();

				onExecute?.({
					id,
					eventId,
					eventPhase: "Started",
					payload: {
						format: "text",
						data: "Generating HTML...",
						metadata: {
							contentType: "plain",
						},
					},
				});

				let generatedHtml = "";

				// Generate HTML using the LLM client
				await client.chat({
					message: systemPrompt,
					onTextChunk: (chunk: string) => {
						generatedHtml += chunk;
						onExecute?.({
							id,
							eventId,
							eventPhase: "InProgress",
							payload: {
								format: "text",
								data: generatedHtml,
								metadata: {
									contentType: "html",
								},
							},
						});
					},
				});

				// Preview the generated HTML
				previewHtmlWithConfirm(generatedHtml);

				onExecute?.({
					id,
					eventId,
					eventPhase: "Ended",
					payload: {
						format: "text",
						data: generatedHtml,
						metadata: {
							contentType: "html",
						},
					},
				});
			} catch (error) {
				console.error("Error generating HTML:", error);
				alert("An error occurred during HTML generation.");

				const eventId = newEventId();
				onExecute?.({
					id,
					eventId,
					eventPhase: "Ended",
					payload: {
						format: "error",
						data: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
					},
				});
			}

			setProcessIdList((prev) => prev.filter((pid) => pid !== processId));
		},
		[apiKey, canvasRef],
	);

	// Handle button click for execution
	const handleButtonClick = useCallback(() => {
		handleExecution();
	}, [handleExecution]);

	// Handle propagation events from child components
	const onPropagation = useCallback(
		(e: ExecutionPropagationEvent) => {
			if (e.eventPhase === "Ended") {
				// Extract data from the propagation event payload
				const propagatedData = e.payload?.data;

				// Handle execution with the propagated data
				handleExecution(propagatedData);
			}
		},
		[handleExecution],
	);

	// Calculate button position
	const buttonX = width / 2 - BUTTON_WIDTH / 2 - BASE_MARGIN;
	const buttonY = height / 2 - BUTTON_HEIGHT / 2 - BUTTON_MARGIN_BOTTOM;

	return (
		<>
			<Frame
				{...props}
				width={width}
				height={height}
				stroke={BORDER_COLOR}
				strokeWidth={BORDER_WIDTH}
				strokeDashType="solid"
				fill={BACKGROUND_COLOR}
				cornerRadius={CORNER_RADIUS}
				keepProportion={false}
				rotateEnabled={true}
				inversionEnabled={true}
				isTransforming={false}
				onPropagation={onPropagation}
			>
				<Button
					id={`${id}-button`}
					x={buttonX}
					y={buttonY}
					width={BUTTON_WIDTH}
					height={BUTTON_HEIGHT}
					scaleX={1}
					scaleY={1}
					rotation={0}
					keepProportion={false}
					rotateEnabled={true}
					inversionEnabled={true}
					strokeDashType="solid"
					isSelected={false}
					isAncestorSelected={false}
					isRootSelected={false}
					showConnectPoints={false}
					connectEnabled={false}
					showOutline={false}
					outlineDisabled={false}
					isTransforming={false}
					text={processIdList.length > 0 ? "Generating..." : "Generate HTML"}
					isTextEditing={false}
					effectsEnabled
					onDrag={handleDrag}
					onClick={handleButtonClick}
				/>
			</Frame>
		</>
	);
};

export const HtmlGenNode = memo(HtmlGenNodeComponent);
