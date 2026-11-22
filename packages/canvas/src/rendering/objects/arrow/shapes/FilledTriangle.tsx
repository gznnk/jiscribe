import { ARROW_SIZE } from "@jiscribe/doc/model/objects/arrow/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPolygon } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * FilledTriangle arrow shape component.
 */
const FilledTriangleArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0
	const points = `0,0 ${-ARROW_SIZE},${ARROW_SIZE / 2} ${-ARROW_SIZE},${-ARROW_SIZE / 2}`;

	return (
		<ArrowPolygon
			points={points}
			fillColor={color}
			alpha={opacity}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const FilledTriangleArrow = memo(FilledTriangleArrowComponent);
