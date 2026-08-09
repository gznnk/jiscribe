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
	CROW_FOOT_LENGTH,
	CROW_FOOT_MARK_GAP,
} from "./utils/crowFootGeometry";

/** Distance from the tip to the bar standing behind the prongs. */
const BAR_DISTANCE = CROW_FOOT_LENGTH + CROW_FOOT_MARK_GAP;

/**
 * Inset (in local units) used to terminate the line at this arrow's base.
 * The mark draws its own spine, so the line stops at the rear bar.
 */
export const CROW_FOOT_ONE_MANY_INSET = BAR_DISTANCE;

/**
 * CrowFootOneMany arrow shape component.
 * ER crow's foot notation: one or many (`1..*`).
 */
const CrowFootOneManyArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - bar then prongs toward the tip
	const d = [
		buildCrowFootSpine(CROW_FOOT_ONE_MANY_INSET),
		buildCrowFootProngs(),
		buildCrowFootBar(BAR_DISTANCE),
	].join(" ");

	return (
		<ArrowPath
			d={d}
			strokeColor={color}
			strokeWidth={1}
			strokeLinejoin="miter"
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const CrowFootOneManyArrow = memo(CrowFootOneManyArrowComponent);
