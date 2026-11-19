import { CROW_FOOT_MANY_INSET } from "@jiscribe/doc/model/objects/arrows/arrowHeadDimensions";
import { radiansToDegrees } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../utils/createSvgTransform";
import type { ArrowShapeProps } from "../ArrowTypes";
import { ArrowPath } from "./ArrowStyled";
import {
	buildCrowFootProngs,
	buildCrowFootSpine,
} from "./utils/crowFootGeometry";

/**
 * CrowFootMany arrow shape component.
 * ER crow's foot notation: many (no lower bound stated).
 */
const CrowFootManyArrowComponent: React.FC<ArrowShapeProps> = ({
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
	// Arrow with tip at (0,0), pointing right when radians=0 - prongs open toward the tip
	const d = `${buildCrowFootSpine(CROW_FOOT_MANY_INSET)} ${buildCrowFootProngs()}`;

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

export const CrowFootManyArrow = memo(CrowFootManyArrowComponent);
