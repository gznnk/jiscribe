import type React from "react";
import { memo } from "react";

import type { AgentNodeProps } from "../../../types/props/nodes/AgentNodeProps";
// Import components related to SvgCanvas.
import { IconContainer } from "../../core/IconContainer";
import { Agent } from "../../icons/Agent";

/**
 * AgentNode minimap component - lightweight version without outlines, controls, and labels.
 */
const AgentNodeMinimapComponent: React.FC<AgentNodeProps> = (props) => {
	return (
		<IconContainer
			x={props.x}
			y={props.y}
			width={props.width}
			height={props.height}
			rotation={props.rotation}
			scaleX={props.scaleX}
			scaleY={props.scaleY}
		>
			<Agent width={props.width} height={props.height} animation={false} />
		</IconContainer>
	);
};

export const AgentNodeMinimap = memo(AgentNodeMinimapComponent);
