import type React from "react";
import { memo } from "react";

import type { ArrowHeadComponentProps } from "./ArrowHeadTypes";
import { ARROW_HEAD_SIZE } from "./constants";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * FilledDiamond arrow head component.
 */
const FilledDiamondArrowHeadComponent: React.FC<ArrowHeadComponentProps> = ({
	x,
	y,
	color,
	radians,
	scale,
}) => {
	const transform = createSvgTransform(scale, scale, radians, x, y);
	const size = ARROW_HEAD_SIZE;
	// Arrow head with tip at (0,0), pointing up when radians=0
	const points = `0,0 ${size / 2},${-size / 2} 0,${-size} ${-size / 2},${-size / 2}`;

	return <polygon points={points} fill={color} transform={transform} />;
};

export const FilledDiamondArrowHead = memo(FilledDiamondArrowHeadComponent);
