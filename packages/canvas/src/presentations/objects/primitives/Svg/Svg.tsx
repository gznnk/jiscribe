import DOMPurify from "dompurify";
import type React from "react";
import { memo, useEffect, useMemo, useRef } from "react";

import { isValidSvgString } from "./isValidSvgString";
import { ERROR_SVG_ICON_STRING, SVG_NAMESPACE } from "./SvgConstants";
import { SvgContentGroup, SvgHitRect } from "./SvgStyled";
import type { SvgState } from "../../../../states/objects/primitives/svg/SvgState";
import { createSvgTransform } from "../../utils/createSvgTransform";

type SvgProps = SvgState;

/**
 * Reads a length attribute as a number. Accepts unitless / px only; % or em etc.
 * return undefined.
 */
const parseLength = (value: string | null): number | undefined => {
	if (value === null || /%\s*$/.test(value)) {
		return undefined;
	}
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * Sanitizes and builds the SVG element to inject.
 * If there is no viewBox, synthesizes one from the width/height attributes
 * (defaulting to 100), and uses preserveAspectRatio="none" to stretch it to fit
 * the box exactly.
 */
const buildSvgElement = (svgText: string): SVGElement => {
	let sanitized = DOMPurify.sanitize(svgText, { NAMESPACE: SVG_NAMESPACE });
	if (!isValidSvgString(sanitized)) {
		sanitized = ERROR_SVG_ICON_STRING;
	}

	const element = new DOMParser().parseFromString(sanitized, "image/svg+xml")
		.documentElement as unknown as SVGElement;

	if (!element.getAttribute("viewBox")) {
		const intrinsicWidth = parseLength(element.getAttribute("width")) ?? 100;
		const intrinsicHeight = parseLength(element.getAttribute("height")) ?? 100;
		element.setAttribute("viewBox", `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
	}
	element.setAttribute("preserveAspectRatio", "none");

	return element;
};

const SvgComponent: React.FC<SvgProps> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	svgText,
}) => {
	const contentRef = useRef<SVGGElement>(null);

	// Parse and sanitize the content only when svgText changes (do not re-parse on resize).
	const svgElement = useMemo(() => buildSvgElement(svgText), [svgText]);

	// Apply the box geometry (position/size) to the injected element. On resize, only update attributes.
	useEffect(() => {
		const group = contentRef.current;
		if (!group) {
			return;
		}
		svgElement.setAttribute("x", `${-width / 2}`);
		svgElement.setAttribute("y", `${-height / 2}`);
		svgElement.setAttribute("width", `${width}`);
		svgElement.setAttribute("height", `${height}`);
		group.replaceChildren(svgElement);
	}, [svgElement, width, height]);

	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	return (
		<g transform={transformAttr}>
			<SvgContentGroup ref={contentRef} />
			<SvgHitRect
				data-kind="object"
				data-id={id}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				tabIndex={0}
			/>
		</g>
	);
};

/** Renders an SVG object: sanitizes and injects its svgText, then transforms it to fit the box. */
export const Svg = memo(SvgComponent);
