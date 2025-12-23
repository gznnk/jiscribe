import type React from "react";
import { memo } from "react";

import type { ArrowHeadComponentProps } from "./ArrowHeadTypes";
import { ARROW_HEAD_SIZE } from "./constants";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * OpenArrow arrow head component.
 */
const OpenArrowArrowHeadComponent: React.FC<ArrowHeadComponentProps> = ({
	x,
	y,
	color,
	radians,
}) => {
	const transform = createSvgTransform(1, 1, radians, x, y);
	const size = ARROW_HEAD_SIZE;
	// Arrow head with tip at (0,0), pointing up when radians=0
	const points = `${-size / 2},${-size} 0,0 ${size / 2},${-size}`;

	return (
		<polyline
			points={points}
			fill="none"
			stroke={color}
			strokeWidth={1.5}
			strokeLinejoin="miter"
			transform={transform}
		/>
	);
};

export const OpenArrowArrowHead = memo(OpenArrowArrowHeadComponent);
