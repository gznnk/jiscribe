import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPath } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/** Half length of each arm, so the cross spans `ARROW_SIZE * 0.8` along the line. */
const CROSS_ARM = ARROW_SIZE * 0.4;

/**
 * Inset (in local units) used to terminate the line at this arrow's base.
 * The cross sits *on* the line (UML draws the non-navigable mark over the
 * association end), so the line runs through to the tip and is not shortened.
 */
export const CROSS_INSET = 0;

/**
 * Cross arrow shape component.
 * UML non-navigable association end; also usable for a destroyed lifeline.
 */
const CrossArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - the cross trails the tip
	const back = -CROSS_ARM * 2;
	const d = `M ${back},${-CROSS_ARM} L 0,${CROSS_ARM} M ${back},${CROSS_ARM} L 0,${-CROSS_ARM}`;

	return (
		<ArrowPath
			d={d}
			strokeColor={color}
			strokeWidth={1}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const CrossArrow = memo(CrossArrowComponent);
