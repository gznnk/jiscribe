import {
	CROW_FOOT_CIRCLE_RADIUS,
	CROW_FOOT_ZERO_MANY_CIRCLE_NEAR_EDGE,
} from "@jiscribe/doc/model/objects/utils/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";
import { ArrowCircle, ArrowGroup, ArrowPath } from "./ArrowStyled";
import {
	buildCrowFootProngs,
	buildCrowFootSpine,
} from "./utils/crowFootGeometry";

/**
 * CrowFootZeroMany arrow shape component.
 * ER crow's foot notation: zero or many (`0..*`).
 */
const CrowFootZeroManyArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - circle then prongs toward the tip
	const d = `${buildCrowFootSpine(CROW_FOOT_ZERO_MANY_CIRCLE_NEAR_EDGE)} ${buildCrowFootProngs()}`;

	return (
		<ArrowGroup
			transform={transform}
			alpha={opacity}
			data-kind={dataKind}
			data-id={dataId}
		>
			<ArrowPath
				d={d}
				strokeColor={color}
				strokeWidth={outlineWidth}
				strokeLinejoin="miter"
			/>
			<ArrowCircle
				cx={-(CROW_FOOT_ZERO_MANY_CIRCLE_NEAR_EDGE + CROW_FOOT_CIRCLE_RADIUS)}
				cy={0}
				r={CROW_FOOT_CIRCLE_RADIUS}
				strokeColor={color}
				strokeWidth={outlineWidth}
			/>
		</ArrowGroup>
	);
};

export const CrowFootZeroManyArrow = memo(CrowFootZeroManyArrowComponent);
