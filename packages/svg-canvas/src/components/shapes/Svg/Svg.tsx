import DOMPurify from "dompurify";
import { memo, useEffect, useRef } from "react";
import type React from "react";

import { ERROR_SVG_ICON_STRING } from "./SvgConstants";
import { SvgGroupElement, SvgRectElement } from "./SvgStyled";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useSelect } from "../../../hooks/useSelect";
import type { SvgProps } from "../../../types/props/shapes/SvgProps";
import { mergeProps } from "../../../utils/core/mergeProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { isValidSvgString } from "../../../utils/validation/isValidSvgString";

/**
 * Svg component.
 */
const SvgComponent: React.FC<SvgProps> = ({
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
	initialWidth,
	initialHeight,
	svgText,
	onDrag,
	onClick,
	onSelect,
}) => {
	// Reference to the element.
	const svgRef = useRef<SVGRectElement>({} as SVGRectElement);
	const groupRef = useRef<SVGGElement>({} as SVGGElement);

	// Prepare props for the drag element.
	const dragProps = useDrag({
		id,
		type: "Rectangle",
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

	// Compose props for SvgRectElement
	const composedProps = mergeProps(dragProps, clickProps, selectProps);

	// Create the transform attribute for the element.
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	// Cache the inner text of the SVG element.
	// This is done to avoid parsing the SVG text on every render.
	useEffect(() => {
		const parser = new DOMParser();
		let sanitizedSvgText = DOMPurify.sanitize(svgText, {
			NAMESPACE: "http://www.w3.org/2000/svg",
		});
		const isValid = isValidSvgString(sanitizedSvgText);
		if (!isValid) {
			sanitizedSvgText = ERROR_SVG_ICON_STRING;
		}
		const svgDoc = parser.parseFromString(sanitizedSvgText, "image/svg+xml");
		const svgElement = svgDoc.documentElement;
		svgElement.setAttribute("width", `${initialWidth}`);
		svgElement.setAttribute("height", `${initialHeight}`);

		groupRef.current.innerHTML = ""; // Clear the previous content
		groupRef.current.appendChild(svgElement); // Append the new SVG element
	}, [svgText, initialWidth, initialHeight]);

	return (
		<>
			<g transform={transform}>
				<SvgGroupElement
					transform={`translate(${-width / 2}, ${-height / 2}) scale(${width / initialWidth}, ${height / initialHeight})`}
					isTransparent={false}
					ref={groupRef}
				/>
				{/* Element for handle pointer events */}
				<SvgRectElement
					id={id}
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					tabIndex={0}
					cursor="move"
					fill="transparent"
					isTransparent={false}
					ref={svgRef}
					{...composedProps}
				/>
			</g>
		</>
	);
};

export const Svg = memo(SvgComponent);
