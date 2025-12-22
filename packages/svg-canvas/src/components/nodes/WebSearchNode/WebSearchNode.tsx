import { OpenAI } from "openai";
import type React from "react";
import { memo, useEffect, useRef, useState } from "react";

import { OpenAiKeyManager } from "../../../utils/KeyManager";
import { RectangleDefaultState } from "../../../constants/state/shapes/RectangleDefaultState";
import { useExecutionChain } from "../../../hooks/useExecutionChain";
import type { WebSearchNodeProps } from "../../../types/props/nodes/WebSearchNodeProps";
import { newEventId } from "../../../utils/core/newEventId";
import { isPlainTextPayload } from "../../../utils/execution/isPlainTextPayload";
import { IconContainer } from "../../core/IconContainer";
import { WebSearch } from "../../icons/WebSearch";
import { Rectangle } from "../../shapes/Rectangle";

/**
 * WebSearchNode component.
 */
const WebSearchNodeComponent: React.FC<WebSearchNodeProps> = (props) => {
	const [apiKey, setApiKey] = useState<string>("");
	const [processIdList, setProcessIdList] = useState<string[]>([]);

	const refBusVal = { props };
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	useEffect(() => {
		const storedApiKey = OpenAiKeyManager.loadKey();
		if (storedApiKey) {
			setApiKey(storedApiKey);
		}
	}, []);

	useExecutionChain({
		id: props.id,
		onPropagation: async (e) => {
			if (!isPlainTextPayload(e.payload)) return;
			const textData = e.payload.data;
			if (textData === "") return;
			if (e.eventPhase !== "Ended") return;

			const processId = newEventId();
			setProcessIdList((prev) => [...prev, processId]);

			const openai = new OpenAI({
				apiKey,
				dangerouslyAllowBrowser: true,
			});

			try {
				const stream = await openai.responses.create({
					model: "gpt-4.1",
					tools: [{ type: "web_search_preview" }],
					input: textData,
					tool_choice: "required",
					stream: true,
				});

				let fullOutput = "";

				const eventId = newEventId();

				props.onExecute?.({
					id: props.id,
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

				for await (const event of stream) {
					if (event.type === "response.output_text.delta") {
						const delta = event.delta;
						fullOutput += delta;

						props.onExecute?.({
							id: props.id,
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
					}

					if (event.type === "response.output_text.done") {
						props.onExecute?.({
							id: props.id,
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
					}
				}
			} catch (error) {
				console.error("Error fetching data from OpenAI API:", error);
				alert("An error occurred during API request.");
			}

			setProcessIdList((prev) => prev.filter((id) => id !== processId));
		},
	});

	return (
		<>
			<IconContainer
				x={props.x}
				y={props.y}
				width={props.width}
				height={props.height}
				rotation={props.rotation}
				scaleX={props.scaleX}
				scaleY={props.scaleY}
			>
				<WebSearch
					width={props.width}
					height={props.height}
					animation={processIdList.length !== 0}
				/>
			</IconContainer>
			<Rectangle
				{...RectangleDefaultState}
				{...props}
				isTransparent
				isTextEditing={false}
				isTextEditEnabled={false}
			/>
		</>
	);
};

export const WebSearchNode = memo(WebSearchNodeComponent);
