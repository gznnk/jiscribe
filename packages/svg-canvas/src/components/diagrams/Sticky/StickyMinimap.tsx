import type React from "react";
import { memo } from "react";

import type { StickyProps } from "../../../types/props/diagrams/StickyProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * Sticky minimap component (simplified version for minimap)
 */
const StickyMinimapComponent: React.FC<StickyProps> = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	fill = "#fff275",
	stroke = "#d4af37",
	strokeWidth = 1,
}) => {
	// Generate transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<rect
			x={-width / 2}
			y={-height / 2}
			width={width}
			height={height}
			fill={fill}
			stroke={stroke}
			strokeWidth={strokeWidth}
			transform={transform}
		/>
	);
};

export const StickyMinimap = memo(StickyMinimapComponent);