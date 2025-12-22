import type React from "react";
import { memo } from "react";

import { RectangleDefaultState } from "../../../constants/state/shapes/RectangleDefaultState";
import { useAddDiagram } from "../../../hooks/useAddDiagram";
import { useExecutionChain } from "../../../hooks/useExecutionChain";
import type { SvgToDiagramNodeProps } from "../../../types/props/nodes/SvgToDiagramNodeProps";
import type { Diagram } from "../../../types/state/core/Diagram";
import { isPlainTextPayload } from "../../../utils/execution/isPlainTextPayload";
import { createSvgStateFromText } from "../../../utils/nodes/svgToDiagramNode/createSvgStateFromText";
import { IconContainer } from "../../core/IconContainer";
import { Gachapon } from "../../icons/Gachapon";
import { Rectangle } from "../../shapes/Rectangle";

/**
 * SvgToDiagramNode component.
 */
const SvgToDiagramNodeComponent: React.FC<SvgToDiagramNodeProps> = (props) => {
	// Create a function to add a new diagram.
	const addDiagram = useAddDiagram();

	// Use execution chain to handle the event propagation.
	useExecutionChain({
		id: props.id,
		onPropagation: (e) => {
			if (e.eventPhase !== "Ended") return;

			if (!isPlainTextPayload(e.payload)) return;
			const textData = e.payload.data;
			const svgData = createSvgStateFromText(textData);
			if (!svgData) return;

			svgData.x = props.x + (Math.random() - 0.5) * 300;
			svgData.y = props.y + (Math.random() - 0.5) * 300;

			addDiagram(svgData as Diagram);
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
				<Gachapon width={props.width} height={props.height} />
			</IconContainer>
			<Rectangle
				{...RectangleDefaultState}
				{...props}
				isTransparent
				isTextEditEnabled={false}
			/>
		</>
	);
};

export const SvgToDiagramNode = memo(SvgToDiagramNodeComponent);
