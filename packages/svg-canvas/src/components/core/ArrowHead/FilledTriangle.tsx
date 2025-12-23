import type React from "react";
import { memo } from "react";

import type { ArrowHeadComponentProps } from "./ArrowHeadTypes";
import { ARROW_HEAD_SIZE } from "./constants";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * FilledTriangle arrow head component.
 */
const FilledTriangleArrowHeadComponent: React.FC<ArrowHeadComponentProps> = ({
	x,
	y,
	color,
	radians,
	scale,
}) => {
	const transform = createSvgTransform(scale, scale, radians, x, y);
	// Arrow head with tip at (0,0), pointing right when radians=0
	const points = `0,0 ${-ARROW_HEAD_SIZE},${ARROW_HEAD_SIZE / 2} ${-ARROW_HEAD_SIZE},${-ARROW_HEAD_SIZE / 2}`;

	return <polygon points={points} fill={color} transform={transform} />;
};

export const FilledTriangleArrowHead = memo(FilledTriangleArrowHeadComponent);
