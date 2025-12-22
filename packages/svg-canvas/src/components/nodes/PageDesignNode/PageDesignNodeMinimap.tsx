import type React from "react";
import { memo } from "react";

import type { PageDesignNodeProps } from "../../../types/props/nodes/PageDesignNodeProps";
import { IconContainer } from "../../core/IconContainer";
import { PageDesign } from "../../icons/PageDesign";

/**
 * PageDesignNode minimap component - lightweight version without outlines, controls, and labels.
 */
const PageDesignNodeMinimapComponent: React.FC<PageDesignNodeProps> = (
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
		>
			<PageDesign width={props.width} height={props.height} animation={false} />
		</IconContainer>
	);
};

export const PageDesignNodeMinimap = memo(PageDesignNodeMinimapComponent);
