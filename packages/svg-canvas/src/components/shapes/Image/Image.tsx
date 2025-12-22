import type React from "react";
import { memo, useRef } from "react";

import { ImageElement } from "./ImageStyled";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useSelect } from "../../../hooks/useSelect";
import type { ImageProps } from "../../../types/props/shapes/ImageProps";
import { mergeProps } from "../../../utils/core/mergeProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * Image component.
 */
const ImageComponent: React.FC<ImageProps> = ({
	id,
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	isSelected,
	isAncestorSelected = false,
	base64Data,
	onDrag,
	onClick,
	onSelect,
}) => {
	// Reference to the element.
	const svgRef = useRef<SVGImageElement>({} as SVGImageElement);

	// Prepare props for the drag element.
	const dragProps = useDrag({
		id,
		type: "Image",
		x,
		y,
		ref: svgRef,
		onDrag,
	});
	// Generate properties for clicking
	const clickProps = useClick({
		id,
		x,
		y,
		isSelected,
		isAncestorSelected,
		ref: svgRef,
		onClick,
	});
	// Generate properties for selection
	const selectProps = useSelect({
		id,
		onSelect,
	});
	// Compose props for ImageElement
	const composedProps = mergeProps(dragProps, clickProps, selectProps);

	// Create the transform attribute for the element.
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<>
			<g transform={transform}>
				<ImageElement
					id={id}
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					tabIndex={0}
					cursor="move"
					href={`data:image/png;base64,${base64Data}`}
					isTransparent={false}
					ref={svgRef}
					{...composedProps}
				/>
			</g>
		</>
	);
};

export const Image = memo(ImageComponent);
