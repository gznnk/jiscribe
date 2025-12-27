import { degreesToRadians, negativeToZero } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * Props for the Outline component.
 */
type OutlineProps = {
	cx: number;
	cy: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	showOutline: boolean;
	zoom: number;
};

/**
 * Component that displays a selection outline around diagram elements.
 * Shows a dashed border when showOutline is true.
 * Can show outline for various states like area selection or when parent group is selected.
 */
const OutlineComponent: React.FC<OutlineProps> = ({
	cx,
	cy,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	showOutline,
	zoom,
}) => {
	// Don't render if not showing outline
	if (!showOutline) {
		return null;
	}

	const radians = degreesToRadians(rotation);

	return (
		<rect
			x={-width / 2}
			y={-height / 2}
			width={negativeToZero(width)}
			height={negativeToZero(height)}
			fill="transparent"
			stroke="rgba(107, 114, 128, 0.8)"
			strokeWidth={1 / zoom}
			strokeDasharray={`${4 / zoom},${2 / zoom}`}
			pointerEvents="none"
			transform={createSvgTransform(scaleX, scaleY, radians, cx, cy)}
		/>
	);
};

export const Outline = memo(OutlineComponent);
