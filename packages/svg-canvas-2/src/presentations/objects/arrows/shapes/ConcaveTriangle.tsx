import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * ConcaveTriangle arrow shape component.
 */
const ConcaveTriangleArrowComponent: React.FC<ArrowShapeProps> = ({
	x,
	y,
	color,
	radians,
	scale,
}) => {
	const rotationDegrees = radiansToDegrees(radians);
	const transform = createSvgTransform(scale, scale, rotationDegrees, x, y);
	const size = ARROW_SIZE;
	// Arrow with tip at (0,0), pointing right when radians=0 - concave inset at 90% from base
	const points = `0,0 ${-size},${size / 2} ${-size * 0.9},0 ${-size},${-size / 2}`;

	return <polygon points={points} fill={color} transform={transform} />;
};

export const ConcaveTriangleArrow = memo(ConcaveTriangleArrowComponent);
