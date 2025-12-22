import type React from "react";
import { memo } from "react";

import type { ImageGenNodeProps } from "../../../types/props/nodes/ImageGenNodeProps";
import { IconContainer } from "../../core/IconContainer";
import { Picture } from "../../icons/Picture";

/**
 * ImageGenNode minimap component - lightweight version without outlines, controls, and labels.
 */
const ImageGenNodeMinimapComponent: React.FC<ImageGenNodeProps> = (props) => {
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
			<Picture width={props.width} height={props.height} animation={false} />
		</IconContainer>
	);
};

export const ImageGenNodeMinimap = memo(ImageGenNodeMinimapComponent);
