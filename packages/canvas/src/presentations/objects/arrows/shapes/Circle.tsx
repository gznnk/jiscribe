import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowCircle } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * 線をこの矢印の根元で終端させるための inset（ローカル単位）。
 * 最大幅は円の中心（`-ARROW_SIZE/2`）。塗りで隠れる中心まで食い込ませる。
 */
export const CIRCLE_INSET = ARROW_SIZE / 2;

/**
 * Circle arrow shape component.
 */
const CircleArrowComponent: React.FC<ArrowShapeProps> = ({
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
	const radius = ARROW_SIZE / 2;
	// Arrow with tip at (0,0), pointing right when radians=0 - circle center offset by radius
	const cx = -radius;

	return (
		<ArrowCircle
			cx={cx}
			cy={0}
			r={radius}
			fillColor={color}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const CircleArrow = memo(CircleArrowComponent);
