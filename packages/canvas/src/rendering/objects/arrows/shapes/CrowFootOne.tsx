import {
	CROW_FOOT_BAR_OFFSET,
	CROW_FOOT_ONE_INSET,
	CROW_FOOT_ONE_REAR_BAR_DISTANCE,
} from "@jiscribe/doc/model/objects/arrows/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";
import { ArrowPath } from "./ArrowStyled";
import { buildCrowFootBar, buildCrowFootSpine } from "./utils/crowFootGeometry";

/**
 * CrowFootOne arrow shape component.
 * ER crow's foot notation: exactly one (`1..1`), drawn as two bars.
 */
const CrowFootOneArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - two bars trailing the tip
	const d = [
		buildCrowFootSpine(CROW_FOOT_ONE_INSET),
		buildCrowFootBar(CROW_FOOT_BAR_OFFSET),
		buildCrowFootBar(CROW_FOOT_ONE_REAR_BAR_DISTANCE),
	].join(" ");

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

export const CrowFootOneArrow = memo(CrowFootOneArrowComponent);
