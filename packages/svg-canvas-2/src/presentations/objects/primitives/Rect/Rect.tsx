import type React from "react";
import { memo } from "react";

import { RectElement } from "./RectStyled";
import type { RectState } from "../../../../states/objects/primitives/RectState";
import { createSvgTransform } from "../../utils/createSvgTransform";

type RectProps = RectState;

const RectComponent: React.FC<RectProps> = ({
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	fill,
	stroke,
	strokeWidth,
}) => {
	// Create SVG transform attribute
	// Using the center point for transformation
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	return (
		<RectElement
			x={-width / 2}
			y={-height / 2}
			width={width}
			height={height}
			// Apply transforms
			transform={transformAttr}
			// Apply styles
			fill={fill}
			stroke={stroke}
			strokeWidth={strokeWidth}
		/>
	);
};

export const Rect = memo(RectComponent);
