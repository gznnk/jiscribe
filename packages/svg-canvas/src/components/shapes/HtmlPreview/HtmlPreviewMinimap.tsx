import type React from "react";
import { memo } from "react";

import type { HtmlPreviewProps } from "../../../types/props/shapes/HtmlPreviewProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * HtmlPreview minimap component (simplified version for minimap)
 */
const HtmlPreviewMinimapComponent: React.FC<HtmlPreviewProps> = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
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
		<g transform={transform}>
			<rect
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				fill="#f0f0f0"
				stroke="#999999"
				strokeWidth="1"
			/>
		</g>
	);
};

export const HtmlPreviewMinimap = memo(HtmlPreviewMinimapComponent);
