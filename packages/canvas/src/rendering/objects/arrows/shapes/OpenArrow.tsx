import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import { ArrowGroup, ArrowPolygon, ArrowPolyline } from "./ArrowStyled";
import type { ArrowExtent, ArrowShapeProps } from "../ArrowTypes";

/**
 * How far short of the tip (in stroke widths) the line stops once the head is
 * scaled below ARROW_OUTLINE_THINNING_SCALE and its outline thins: where the V's
 * arms stand one stroke width apart, so the line's end sits between them instead
 * of showing past the thinner arms. Read by calcArrowLineEndWedge, which
 * calcArrowLineInset stops the line by.
 */
export const OPEN_ARROW_THIN_OUTLINE_LINE_INSET =
	0.5 / Math.tan(Math.atan2(ARROW_SIZE / 2, ARROW_SIZE));

/** How far this head runs from its tip (local units), for the drawn extent (calcArrowReach). */
export const OPEN_ARROW_EXTENT: ArrowExtent = {
	length: ARROW_SIZE,
	halfWidth: ARROW_SIZE / 2,
};

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
