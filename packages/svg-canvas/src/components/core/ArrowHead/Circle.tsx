import type React from "react";
import { memo } from "react";

import type { ArrowHeadComponentProps } from "./ArrowHeadTypes";
import { ARROW_HEAD_SIZE } from "./constants";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * Circle arrow head component.
 */
const CircleArrowHeadComponent: React.FC<ArrowHeadComponentProps> = ({
	x,
	y,
	color,
	radians,
	scale,
}) => {
	const transform = createSvgTransform(scale, scale, radians, x, y);
	const radius = ARROW_HEAD_SIZE / 2;
	// Arrow head with tip at (0,0), pointing up when radians=0 - circle center offset by radius
	const cy = -radius;

	return (
		<circle cx={0} cy={cy} r={radius} fill={color} transform={transform} />
	);
};

export const CircleArrowHead = memo(CircleArrowHeadComponent);
