import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";
import { ArrowPath } from "./ArrowStyled";
import {
	buildCrowFootBar,
	buildCrowFootSpine,
	CROW_FOOT_BAR_OFFSET,
	CROW_FOOT_MARK_GAP,
} from "./utils/crowFootGeometry";

/** Distance from the tip to the bar standing behind the leading one. */
const REAR_BAR_DISTANCE = CROW_FOOT_BAR_OFFSET + CROW_FOOT_MARK_GAP;

/**
 * Inset (in local units) used to terminate the line at this arrow's base.
 * The mark draws its own spine, so the line stops at the rear bar.
 */
export const CROW_FOOT_ONE_INSET = REAR_BAR_DISTANCE;

/**
 * CrowFootOne arrow shape component.
 * ER crow's foot notation: exactly one (`1..1`), drawn as two bars.
 */
const CrowFootOneArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - two bars trailing the tip
	const d = [
		buildCrowFootSpine(CROW_FOOT_ONE_INSET),
		buildCrowFootBar(CROW_FOOT_BAR_OFFSET),
		buildCrowFootBar(REAR_BAR_DISTANCE),
	].join(" ");

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

export const CrowFootOneArrow = memo(CrowFootOneArrowComponent);
