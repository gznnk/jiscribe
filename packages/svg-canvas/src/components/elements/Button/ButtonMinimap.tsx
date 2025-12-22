import type React from "react";
import { memo } from "react";

import { ButtonElement } from "./ButtonStyled";
import type { ButtonProps } from "../../../types/props/elements/ButtonProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * Button minimap component - lightweight version without outlines, controls, and labels.
 */
const ButtonMinimapComponent: React.FC<ButtonProps> = ({
	id,
	x,
	y,
	width,
	height,
	cornerRadius,
	rotation,
	scaleX,
	scaleY,
	fill,
	stroke,
	strokeWidth,
	isTransparent,
}) => {
	// Generate rect transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<ButtonElement
			id={id}
			x={-width / 2}
			y={-height / 2}
			width={width}
			height={height}
			rx={cornerRadius}
			ry={cornerRadius}
			fill={fill}
			stroke={stroke}
			strokeWidth={strokeWidth}
			isTransparent={isTransparent}
			transform={transform}
			pointerEvents="none"
		/>
	);
};

export const ButtonMinimap = memo(ButtonMinimapComponent);
