import type React from "react";
import { memo, useState } from "react";
// Import components related to SvgCanvas.

import { EllipseDefaultState } from "../../../constants/state/shapes/EllipseDefaultState";
// Import hooks related to SvgCanvas.
import { useExecutionChain } from "../../../hooks/useExecutionChain";
// Imports related to this component.
import type { HubNodeProps } from "../../../types/props/nodes/HubNodeProps";
import { isPlainTextPayload } from "../../../utils/execution/isPlainTextPayload";
import { IconContainer } from "../../core/IconContainer";
import { Hub } from "../../icons/Hub";
import { Ellipse } from "../../shapes/Ellipse";

const HubNodeComponent: React.FC<HubNodeProps> = (props) => {
	const [isFlashing, setIsFlashing] = useState(false);

	useExecutionChain({
		id: props.id,
		onPropagation: (e) => {
			if (!isPlainTextPayload(e.payload)) return;
			const textData = e.payload.data;
			setIsFlashing(true);
			setTimeout(() => setIsFlashing(false), 500); // Reset when animation ends
			props.onExecute?.({
				id: props.id,
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				payload: {
					format: "text",
					data: textData,
					metadata: {
						contentType: "plain",
					},
				},
			});
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
				pointerEvents="none"
			>
				<Hub width={props.width} height={props.height} animation={isFlashing} />
			</IconContainer>
			<Ellipse
				{...EllipseDefaultState}
				{...props}
				isTransparent
				isTextEditing={false}
				isTextEditEnabled={false}
			/>
		</>
	);
};

export const HubNode = memo(HubNodeComponent);
