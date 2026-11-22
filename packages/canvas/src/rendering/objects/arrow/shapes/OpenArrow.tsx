import { ARROW_SIZE } from "@jiscribe/doc/model/objects/arrow/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowGroup, ArrowPolygon, ArrowPolyline } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * OpenArrow arrow shape component.
 */
const OpenArrowArrowComponent: React.FC<ArrowShapeProps> = ({
	x,
	y,
	color,
	opacity,
	radians,
	scale,
	outlineWidth,
	lineEndWedge,
	dataKind,
	dataId,
}) => {
	const rotationDegrees = radiansToDegrees(radians);
	const transform = createSvgTransform(scale, scale, rotationDegrees, x, y);
	const size = ARROW_SIZE;
	// Arrow with tip at (0,0), pointing right when radians=0
	const points = `${-size},${-size / 2} 0,0 ${-size},${size / 2}`;

	if (!lineEndWedge) {
		return (
			<ArrowPolyline
				points={points}
				strokeColor={color}
				alpha={opacity}
				strokeWidth={outlineWidth}
				strokeLinejoin="miter"
				transform={transform}
				data-kind={dataKind}
				data-id={dataId}
			/>
		);
	}

	const { inset, lineHalfWidth } = lineEndWedge;
	// Runs back over the line's end so the two antialiased edges leave no seam.
	const overlapEnd = inset + lineHalfWidth;
	return (
		<ArrowGroup
			transform={transform}
			alpha={opacity}
			data-kind={dataKind}
			data-id={dataId}
		>
			<ArrowPolygon
				points={`0,0 ${-inset},${-lineHalfWidth} ${-overlapEnd},${-lineHalfWidth} ${-overlapEnd},${lineHalfWidth} ${-inset},${lineHalfWidth}`}
				fillColor={color}
			/>
			<ArrowPolyline
				points={points}
				strokeColor={color}
				strokeWidth={outlineWidth}
				strokeLinejoin="miter"
			/>
		</ArrowGroup>
	);
};

export const OpenArrowArrow = memo(OpenArrowArrowComponent);
