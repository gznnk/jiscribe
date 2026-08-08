import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowCircle } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * Inset (in local units) used to terminate the line at this arrow's base.
 * The circle is hollow, so the line stops at its far edge (the full diameter)
 * instead of showing through the interior.
 */
export const HOLLOW_CIRCLE_INSET = ARROW_SIZE;

/**
 * HollowCircle arrow shape component.
 * UML provided-interface "ball" (lollipop notation).
 */
const HollowCircleArrowComponent: React.FC<ArrowShapeProps> = ({
	x,
	y,
	color,
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
			strokeColor={color}
			strokeWidth={1}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const HollowCircleArrow = memo(HollowCircleArrowComponent);
