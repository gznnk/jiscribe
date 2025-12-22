import type React from "react";
import { memo } from "react";

import { calcBottomLabelPosition } from "./BottomLabelUtils";
import { calcRectangleVertices } from "../../../utils/math/geometry/calcRectangleVertices";

/**
 * Props for BottomLabel component.
 */
type BottomLabelProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	children: React.ReactNode;
};

/**
 * BottomLabel component.
 */
const BottomLabelComponent: React.FC<BottomLabelProps> = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	children,
}) => {
	const vertices = calcRectangleVertices({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	const { labelX, labelY } = calcBottomLabelPosition(vertices);

	return (
		<text
			x={labelX}
			y={labelY}
			fill="#555555"
			fontSize="12px"
			textAnchor="middle"
		>
			{children}
		</text>
	);
};

export const BottomLabel = memo(BottomLabelComponent);
