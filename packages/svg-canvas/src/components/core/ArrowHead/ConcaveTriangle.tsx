import type React from "react";
import { memo } from "react";

import type { ArrowHeadComponentProps } from "./ArrowHeadTypes";
import { ARROW_HEAD_SIZE } from "./constants";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * ConcaveTriangle arrow head component.
 */
const ConcaveTriangleArrowHeadComponent: React.FC<ArrowHeadComponentProps> = ({
	x,
	y,
	color,
	radians,
	scale,
}) => {
	const transform = createSvgTransform(scale, scale, radians, x, y);
	const size = ARROW_HEAD_SIZE;
	// Arrow head with tip at (0,0), pointing right when radians=0 - concave inset at 90% from base
	const points = `0,0 ${-size},${size / 2} ${-size * 0.9},0 ${-size},${-size / 2}`;

	return <polygon points={points} fill={color} transform={transform} />;
};

export const ConcaveTriangleArrowHead = memo(ConcaveTriangleArrowHeadComponent);
