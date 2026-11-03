import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowExtent, ArrowShapeProps } from "../ArrowTypes";
import { ArrowCircle, ArrowGroup, ArrowPath } from "./ArrowStyled";
import {
	buildCrowFootBar,
	buildCrowFootSpine,
	CROW_FOOT_BAR_OFFSET,
	CROW_FOOT_CIRCLE_RADIUS,
	CROW_FOOT_MARK_GAP,
	CROW_FOOT_HALF_HEIGHT,
} from "./utils/crowFootGeometry";

/** Distance from the tip to the near edge of the circle, where the spine ends. */
const CIRCLE_NEAR_EDGE = CROW_FOOT_BAR_OFFSET + CROW_FOOT_MARK_GAP;

/**
 * Inset (in local units) used to terminate the line at this arrow's base.
 * The line stops at the circle's far edge; the circle bridges the gap to the
 * spine, so nothing crosses the hollow interior.
 */
export const CROW_FOOT_ZERO_ONE_INSET =
	CIRCLE_NEAR_EDGE + CROW_FOOT_CIRCLE_RADIUS * 2;

/**
 * How far this head runs from its tip (local units), for the drawn extent
 * (calcArrowReach). The circle's far edge is the rearmost point; it is narrower than the bar.
 */
export const CROW_FOOT_ZERO_ONE_EXTENT: ArrowExtent = {
	length: CROW_FOOT_ZERO_ONE_INSET,
	halfWidth: CROW_FOOT_HALF_HEIGHT,
};

/**
 * CrowFootZeroOne arrow shape component.
 * ER crow's foot notation: zero or one (`0..1`).
 */
const CrowFootZeroOneArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - circle then bar toward the tip
	const d = `${buildCrowFootSpine(CIRCLE_NEAR_EDGE)} ${buildCrowFootBar(CROW_FOOT_BAR_OFFSET)}`;

	return (
		<ArrowGroup
			transform={transform}
			alpha={opacity}
			data-kind={dataKind}
			data-id={dataId}
		>
			<ArrowPath d={d} strokeColor={color} strokeWidth={outlineWidth} />
			<ArrowCircle
				cx={-(CIRCLE_NEAR_EDGE + CROW_FOOT_CIRCLE_RADIUS)}
				cy={0}
				r={CROW_FOOT_CIRCLE_RADIUS}
				strokeColor={color}
				strokeWidth={outlineWidth}
			/>
		</ArrowGroup>
	);
};

export const CrowFootZeroOneArrow = memo(CrowFootZeroOneArrowComponent);
