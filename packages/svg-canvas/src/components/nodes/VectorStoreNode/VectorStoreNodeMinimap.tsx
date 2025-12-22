import type React from "react";
import { memo } from "react";

import type { VectorStoreNodeProps } from "../../../types/props/nodes/VectorStoreNodeProps";
// Import components related to SvgCanvas.
import { IconContainer } from "../../core/IconContainer";
import { VectorStore } from "../../icons/VectorStore";

/**
 * VectorStoreNode minimap component - lightweight version without outlines, controls, and labels.
 */
const VectorStoreNodeMinimapComponent: React.FC<VectorStoreNodeProps> = (
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
			<VectorStore
				width={props.width}
				height={props.height}
				animation={false}
			/>
		</IconContainer>
	);
};

export const VectorStoreNodeMinimap = memo(VectorStoreNodeMinimapComponent);
