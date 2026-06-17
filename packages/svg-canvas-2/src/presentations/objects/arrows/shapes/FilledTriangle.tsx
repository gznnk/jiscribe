import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPolygon } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * 線をこの矢印の根元で終端させるための inset（ローカル単位）。
 * 底辺が `-ARROW_SIZE` にあるため、線は底辺で止める。
 */
export const FILLED_TRIANGLE_INSET = ARROW_SIZE;

/**
 * FilledTriangle arrow shape component.
 */
const FilledTriangleArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0
	const points = `0,0 ${-ARROW_SIZE},${ARROW_SIZE / 2} ${-ARROW_SIZE},${-ARROW_SIZE / 2}`;

	return (
		<ArrowPolygon
			points={points}
			fill={color}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const FilledTriangleArrow = memo(FilledTriangleArrowComponent);
