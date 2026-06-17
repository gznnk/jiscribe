import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPolygon } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * 線をこの矢印の根元で終端させるための inset（ローカル単位）。
 * 中空なので線が内部を貫通しないよう、後端の頂点（`-ARROW_SIZE`）で止める。
 */
export const HOLLOW_DIAMOND_INSET = ARROW_SIZE;

/**
 * HollowDiamond arrow shape component.
 */
const HollowDiamondArrowComponent: React.FC<ArrowShapeProps> = ({
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
	const size = ARROW_SIZE;
	// Arrow with tip at (0,0), pointing right when radians=0
	const points = `0,0 ${-size / 2},${size / 2} ${-size},0 ${-size / 2},${-size / 2}`;

	return (
		<ArrowPolygon
			points={points}
			fill="none"
			stroke={color}
			strokeWidth={1}
			strokeLinejoin="miter"
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const HollowDiamondArrow = memo(HollowDiamondArrowComponent);
