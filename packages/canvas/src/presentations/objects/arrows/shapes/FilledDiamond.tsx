import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPolygon } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * Inset (in local units) for terminating the line at this arrow's base.
 * The widest point is the center (`-ARROW_SIZE/2`). Pulling the line back to the
 * trailing vertex would make it look too short, so the line is inset to the
 * center where it is hidden by the fill.
 */
export const FILLED_DIAMOND_INSET = ARROW_SIZE / 2;

/**
 * FilledDiamond arrow shape component.
 */
const FilledDiamondArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0
	const points = `0,0 ${-size / 2},${size / 2} ${-size},0 ${-size / 2},${-size / 2}`;

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

export const FilledDiamondArrow = memo(FilledDiamondArrowComponent);
