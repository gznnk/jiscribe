import type React from "react";
import { memo, useState } from "react";

import { RectangleDefaultState } from "../../../constants/state/shapes/RectangleDefaultState";
import { useExecutionChain } from "../../../hooks/useExecutionChain";
import { useWebDesignTool } from "../../../tools/web_design";
import type { PageDesignNodeProps } from "../../../types/props/nodes/PageDesignNodeProps";
import type { Diagram } from "../../../types/state/core/Diagram";
import { isPlainTextPayload } from "../../../utils/execution/isPlainTextPayload";
import { IconContainer } from "../../core/IconContainer";
import { PageDesign } from "../../icons/PageDesign";
import { Rectangle } from "../../shapes/Rectangle";

/**
 * PageDesignNode component.
 */
const PageDesignNodeComponent: React.FC<PageDesignNodeProps> = (props) => {
	const [isProcessing, setIsProcessing] = useState(false);
	const webDesignHandler = useWebDesignTool();

	useExecutionChain({
		id: props.id,
		onPropagation: async (e) => {
			if (!isPlainTextPayload(e.payload)) return;
			const textData = e.payload.data;
			if (textData === "") return;
			if (e.eventPhase !== "Ended") return;

			setIsProcessing(true);

			props.onExecute?.({
				id: props.id,
				eventId: e.eventId,
				eventPhase: "Started",
				payload: {
					format: "text",
					data: "",
					metadata: {
						contentType: "plain",
					},
				},
			});

			try {
				// Create shape handler that sends each shape immediately via onExecute
				const shapeHandler = (diagram: Diagram) => {
					// Send each generated shape immediately via onExecute
					props.onExecute?.({
						id: props.id,
						eventId: e.eventId,
						eventPhase: "InProgress",
						payload: {
							format: "diagram",
							data: diagram,
						},
					});
				};

				// Create group shapes handler that sends grouping result via onExecute
				const groupShapesHandler = (result: {
					shapeIds: string[];
					groupId: string;
					name?: string;
					description?: string;
				}) => {
					props.onExecute?.({
						id: props.id,
						eventId: e.eventId,
						eventPhase: "InProgress",
						// TODO: Define a proper payload format for tool results
						payload: {
							format: "tool",
							data: result,
						},
					});
				};

				// Create resize canvas frame handler that sends resize result via onExecute
				const resizeCanvasFrameHandler = (result: {
					width: number;
					height: number;
				}) => {
					props.onExecute?.({
						id: props.id,
						eventId: e.eventId,
						eventPhase: "InProgress",
						// TODO: Define a proper payload format for tool results
						payload: {
							format: "tool",
							data: result,
						},
					});
				};

				const result = await webDesignHandler(
					shapeHandler,
					groupShapesHandler,
					resizeCanvasFrameHandler,
				)({
					name: "web_design",
					arguments: { design_request: textData },
					callId: e.eventId,
				});

				props.onExecute?.({
					id: props.id,
					eventId: e.eventId,
					eventPhase: "Ended",
					payload: {
						format: "text",
						data: typeof result?.content === "string" ? result.content : "",
						metadata: {
							contentType: "plain",
						},
					},
				});
			} catch (error) {
				console.error("Error in PageDesignNode web design:", error);
				props.onExecute?.({
					id: props.id,
					eventId: e.eventId,
					eventPhase: "Ended",
					payload: {
						format: "text",
						data: "Error generating web design.",
						metadata: {
							contentType: "plain",
						},
					},
				});
			} finally {
				setIsProcessing(false);
			}
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
				<PageDesign
					width={props.width}
					height={props.height}
					animation={isProcessing}
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

export const PageDesignNode = memo(PageDesignNodeComponent);
