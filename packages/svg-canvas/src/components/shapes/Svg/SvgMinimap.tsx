import DOMPurify from "dompurify";
import type React from "react";
import { memo, useEffect, useRef } from "react";

import { SvgGroupElement } from "./SvgStyled";
import type { SvgProps } from "../../../types/props/shapes/SvgProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * Svg minimap component - lightweight version without outlines, controls, and labels.
 */
const SvgMinimapComponent: React.FC<SvgProps> = ({
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	initialWidth,
	initialHeight,
	svgText,
}) => {
	// Reference to the element.
	const groupRef = useRef<SVGGElement>({} as SVGGElement);

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
		const sanitizedSvgText = DOMPurify.sanitize(svgText, {
			NAMESPACE: "http://www.w3.org/2000/svg",
		});
		const svgDoc = parser.parseFromString(sanitizedSvgText, "image/svg+xml");
		const svgElement = svgDoc.documentElement;
		svgElement.setAttribute("width", `${initialWidth}`);
		svgElement.setAttribute("height", `${initialHeight}`);

		groupRef.current.innerHTML = ""; // Clear the previous content
		groupRef.current.appendChild(svgElement); // Append the new SVG element
	}, [svgText, initialWidth, initialHeight]);

	return (
		<g transform={transform}>
			<SvgGroupElement
				transform={`translate(${-width / 2}, ${-height / 2}) scale(${width / initialWidth}, ${height / initialHeight})`}
				isTransparent={false}
				ref={groupRef}
				pointerEvents="none"
			/>
		</g>
	);
};

export const SvgMinimap = memo(SvgMinimapComponent);
