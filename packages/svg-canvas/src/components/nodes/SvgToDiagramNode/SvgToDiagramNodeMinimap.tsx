import type React from "react";
import { memo } from "react";

import type { SvgToDiagramNodeProps } from "../../../types/props/nodes/SvgToDiagramNodeProps";
import { IconContainer } from "../../core/IconContainer";
import { Gachapon } from "../../icons/Gachapon";

/**
 * SvgToDiagramNode minimap component - lightweight version without outlines, controls, and labels.
 */
const SvgToDiagramNodeMinimapComponent: React.FC<SvgToDiagramNodeProps> = (
	props,
) => {
	return (
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
	);
};

export const SvgToDiagramNodeMinimap = memo(SvgToDiagramNodeMinimapComponent);
