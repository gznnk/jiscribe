import { CROSS_ARM } from "@jiscribe/doc/model/objects/arrows/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPath } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * Cross arrow shape component.
 * UML non-navigable association end; also usable for a destroyed lifeline.
 */
const CrossArrowComponent: React.FC<ArrowShapeProps> = ({
	x,
	y,
	color,
	opacity,
	radians,
	scale,
	outlineWidth,
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
			alpha={opacity}
			strokeWidth={outlineWidth}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const CrossArrow = memo(CrossArrowComponent);
