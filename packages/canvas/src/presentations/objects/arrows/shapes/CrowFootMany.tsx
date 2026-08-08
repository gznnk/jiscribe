import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";
import { ArrowPath } from "./ArrowStyled";
import {
	buildCrowFootProngs,
	buildCrowFootSpine,
	CROW_FOOT_LENGTH,
} from "./utils/crowFootGeometry";

/**
 * Inset (in local units) used to terminate the line at this arrow's base.
 * The mark draws its own spine, so the line stops where the prongs converge.
 */
export const CROW_FOOT_MANY_INSET = CROW_FOOT_LENGTH;

/**
 * CrowFootMany arrow shape component.
 * ER crow's foot notation: many (no lower bound stated).
 */
const CrowFootManyArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - prongs open toward the tip
	const d = `${buildCrowFootSpine(CROW_FOOT_MANY_INSET)} ${buildCrowFootProngs()}`;

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

export const CrowFootManyArrow = memo(CrowFootManyArrowComponent);
