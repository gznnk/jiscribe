import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * HollowTriangle arrow shape component.
 */
const HollowTriangleArrowComponent: React.FC<ArrowShapeProps> = ({
	x,
	y,
	color,
	radians,
	scale,
}) => {
	const rotationDegrees = radiansToDegrees(radians);
	const transform = createSvgTransform(scale, scale, rotationDegrees, x, y);
	// Arrow with tip at (0,0), pointing right when radians=0
	const points = `0,0 ${-ARROW_SIZE},${ARROW_SIZE / 2} ${-ARROW_SIZE},${-ARROW_SIZE / 2}`;

	return (
		<polygon
			points={points}
			fill="white"
			stroke={color}
			strokeWidth={1}
			strokeLinejoin="miter"
			transform={transform}
		/>
	);
};

export const HollowTriangleArrow = memo(HollowTriangleArrowComponent);
