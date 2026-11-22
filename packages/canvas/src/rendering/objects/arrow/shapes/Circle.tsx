import { ARROW_SIZE } from "@jiscribe/doc/model/objects/arrow/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowCircle } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * Circle arrow shape component.
 */
const CircleArrowComponent: React.FC<ArrowShapeProps> = ({
	x,
	y,
	color,
	opacity,
	radians,
	scale,
	dataKind,
	dataId,
}) => {
	const rotationDegrees = radiansToDegrees(radians);
	const transform = createSvgTransform(scale, scale, rotationDegrees, x, y);
	const radius = ARROW_SIZE / 2;
	// Arrow with tip at (0,0), pointing right when radians=0 - circle center offset by radius
	const cx = -radius;

	return (
		<ArrowCircle
			cx={cx}
			cy={0}
			r={radius}
			fillColor={color}
			alpha={opacity}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const CircleArrow = memo(CircleArrowComponent);
