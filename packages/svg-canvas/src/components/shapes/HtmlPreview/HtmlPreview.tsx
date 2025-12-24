import { degreesToRadians } from "@workspace/geometry";
import DOMPurify from "dompurify";
import { memo, useEffect, useRef } from "react";
import type React from "react";

import {
	HtmlPreviewContentDiv,
	HtmlPreviewForeignObject,
} from "./HtmlPreviewStyled";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useSelect } from "../../../hooks/useSelect";
import type { HtmlPreviewProps } from "../../../types/props/shapes/HtmlPreviewProps";
import { mergeProps } from "../../../utils/core/mergeProps";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";

/**
 * HtmlPreview component.
 * Renders HTML content inside a foreignObject element with DOMPurify sanitization.
 */
const HtmlPreviewComponent: React.FC<HtmlPreviewProps> = ({
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
	htmlContent,
	onDrag,
	onClick,
	onSelect,
}) => {
	// Reference to the element for interaction
	const foreignObjectRef = useRef<SVGForeignObjectElement>(
		{} as SVGForeignObjectElement,
	);
	const divRef = useRef<HTMLDivElement>({} as HTMLDivElement);

	// Prepare props for the drag element.
	const dragProps = useDrag({
		id,
		type: "HtmlPreview",
		x,
		y,
		ref: foreignObjectRef,
		onDrag,
	});

	// Generate properties for clicking
	const clickProps = useClick({
		id,
		x,
		y,
		isSelected,
		isAncestorSelected,
		ref: foreignObjectRef,
		onClick,
	});

	// Generate properties for selection
	const selectProps = useSelect({
		id,
		onSelect,
	});

	// Compose props for foreignObject element
	const composedProps = mergeProps(dragProps, clickProps, selectProps);

	// Create the transform attribute for the element.
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	// Sanitize and render HTML content
	useEffect(() => {
		const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
			RETURN_DOM_FRAGMENT: false,
			RETURN_DOM: false,
		});

		if (divRef.current) {
			divRef.current.innerHTML = sanitizedHtml;
		}
	}, [htmlContent]);

	return (
		<>
			<g transform={transform}>
				<HtmlPreviewForeignObject
					id={id}
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					tabIndex={0}
					ref={foreignObjectRef}
					{...composedProps}
				>
					<HtmlPreviewContentDiv ref={divRef} />
				</HtmlPreviewForeignObject>
			</g>
		</>
	);
};

export const HtmlPreview = memo(HtmlPreviewComponent);
