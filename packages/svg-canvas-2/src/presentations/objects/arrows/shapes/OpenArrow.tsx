import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * OpenArrow arrow shape component.
 */
const OpenArrowArrowComponent: React.FC<ArrowShapeProps> = ({
	x,
	y,
	color,
	radians,
	scale,
}) => {
	const rotationDegrees = radiansToDegrees(radians);
	const transform = createSvgTransform(scale, scale, rotationDegrees, x, y);
	const size = ARROW_SIZE;
	// Arrow with tip at (0,0), pointing right when radians=0
	const points = `${-size},${-size / 2} 0,0 ${-size},${size / 2}`;

	return (
		<polyline
			points={points}
			fill="none"
			stroke={color}
			strokeWidth={1}
			strokeLinejoin="miter"
			transform={transform}
		/>
	);
};

export const OpenArrowArrow = memo(OpenArrowArrowComponent);
