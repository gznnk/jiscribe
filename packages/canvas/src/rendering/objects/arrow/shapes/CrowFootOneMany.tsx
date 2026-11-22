import {
	CROW_FOOT_ONE_MANY_BAR_DISTANCE,
	CROW_FOOT_ONE_MANY_INSET,
} from "@jiscribe/doc/model/objects/arrow/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";
import { ArrowPath } from "./ArrowStyled";
import {
	buildCrowFootBar,
	buildCrowFootProngs,
	buildCrowFootSpine,
} from "./utils/crowFootGeometry";

/**
 * CrowFootOneMany arrow shape component.
 * ER crow's foot notation: one or many (`1..*`).
 */
const CrowFootOneManyArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - bar then prongs toward the tip
	const d = [
		buildCrowFootSpine(CROW_FOOT_ONE_MANY_INSET),
		buildCrowFootProngs(),
		buildCrowFootBar(CROW_FOOT_ONE_MANY_BAR_DISTANCE),
	].join(" ");

	return (
		<ArrowPath
			d={d}
			strokeColor={color}
			alpha={opacity}
			strokeWidth={outlineWidth}
			strokeLinejoin="miter"
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const CrowFootOneManyArrow = memo(CrowFootOneManyArrowComponent);
