import { calcRectKeyPoints } from "@workspace/geometry";
import type { RectKeyPoints } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { calcBottomLabelPosition } from "../BottomLabel";
import { StyledText } from "./PositionLabelStyled";

/**
 * Props for PositionLabel component.
 */
type PositionLabelProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
};

/**
 * PositionLabel component.
 */
const PositionLabelComponent: React.FC<PositionLabelProps> = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
}) => {
	const keyPoints = calcRectKeyPoints({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	const { labelX, labelY } = calcBottomLabelPosition(keyPoints);

	let left = Number.POSITIVE_INFINITY;
	let top = Number.POSITIVE_INFINITY;
	for (const key of Object.keys(keyPoints)) {
		const keyPoint = keyPoints[key as keyof RectKeyPoints];
		left = Math.min(left, keyPoint.x);
		top = Math.min(top, keyPoint.y);
	}

	return (
		<StyledText
			x={labelX}
			y={labelY}
			fill="#555555" // Font color
			fontSize="12px"
			textAnchor="middle"
		>
			{`(${Math.round(left)}, ${Math.round(top)})`}
		</StyledText>
	);
};

export const PositionLabel = memo(PositionLabelComponent);
