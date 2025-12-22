import type React from "react";
import { memo } from "react";

import { ImageElement } from "./ImageStyled";
import type { ImageProps } from "../../../types/props/shapes/ImageProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * Image minimap component - lightweight version without outlines, controls, and labels.
 */
const ImageMinimapComponent: React.FC<ImageProps> = ({
	id,
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	base64Data,
}) => {
	// Create the transform attribute for the element.
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<g transform={transform}>
			<ImageElement
				id={id}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				href={`data:image/png;base64,${base64Data}`}
				isTransparent={false}
				pointerEvents="none"
			/>
		</g>
	);
};

export const ImageMinimap = memo(ImageMinimapComponent);
