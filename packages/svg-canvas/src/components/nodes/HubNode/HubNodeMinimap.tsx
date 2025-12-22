import type React from "react";
import { memo } from "react";

import type { HubNodeProps } from "../../../types/props/nodes/HubNodeProps";
import { IconContainer } from "../../core/IconContainer";
import { Hub } from "../../icons/Hub";

/**
 * HubNode minimap component - lightweight version without outlines, controls, and labels.
 */
const HubNodeMinimapComponent: React.FC<HubNodeProps> = (props) => {
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
			<Hub width={props.width} height={props.height} animation={false} />
		</IconContainer>
	);
};

export const HubNodeMinimap = memo(HubNodeMinimapComponent);
