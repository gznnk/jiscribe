import type React from "react";
import { memo } from "react";

import type { WebSearchNodeProps } from "../../../types/props/nodes/WebSearchNodeProps";
// Import components related to SvgCanvas.
import { IconContainer } from "../../core/IconContainer";
import { WebSearch } from "../../icons/WebSearch";

/**
 * WebSearchNode minimap component - lightweight version without outlines, controls, and labels.
 */
const WebSearchNodeMinimapComponent: React.FC<WebSearchNodeProps> = (props) => {
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
			<WebSearch width={props.width} height={props.height} animation={false} />
		</IconContainer>
	);
};

export const WebSearchNodeMinimap = memo(WebSearchNodeMinimapComponent);
