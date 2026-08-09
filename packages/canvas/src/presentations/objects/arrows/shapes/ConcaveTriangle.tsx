import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPolygon } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * Inset (in local units) used to terminate the line at this arrow's base.
 * Since the concave notch (valley) at the tail sits at `-ARROW_SIZE * 0.9`,
 * stop the line there.
 */
export const CONCAVE_TRIANGLE_INSET = ARROW_SIZE * 0.9;

/**
 * ConcaveTriangle arrow shape component.
 */
const ConcaveTriangleArrowComponent: React.FC<ArrowShapeProps> = ({
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
	const size = ARROW_SIZE;
	// Arrow with tip at (0,0), pointing right when radians=0 - concave inset at 90% from base
	const points = `0,0 ${-size},${size / 2} ${-size * 0.9},0 ${-size},${-size / 2}`;

	return (
		<ArrowPolygon
			points={points}
			fillColor={color}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const ConcaveTriangleArrow = memo(ConcaveTriangleArrowComponent);
