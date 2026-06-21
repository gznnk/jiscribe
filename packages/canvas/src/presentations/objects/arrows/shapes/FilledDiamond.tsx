import { radiansToDegrees } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { ArrowPolygon } from "./ArrowStyled";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { ARROW_SIZE } from "../ArrowConstants";
import type { ArrowShapeProps } from "../ArrowTypes";

/**
 * 線をこの矢印の根元で終端させるための inset（ローカル単位）。
 * 最大幅は中央（`-ARROW_SIZE/2`）。後端の頂点まで引くと線が短く見えるため、
 * 塗りで隠れる中央まで食い込ませる。
 */
export const FILLED_DIAMOND_INSET = ARROW_SIZE / 2;

/**
 * FilledDiamond arrow shape component.
 */
const FilledDiamondArrowComponent: React.FC<ArrowShapeProps> = ({
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
			fillColor={color}
			transform={transform}
			data-kind={dataKind}
			data-id={dataId}
		/>
	);
};

export const FilledDiamondArrow = memo(FilledDiamondArrowComponent);
