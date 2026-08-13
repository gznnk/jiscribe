import { richTextToPlain } from "@jiscribe/canvas/doc";
import type { FrameTextOverlayProps } from "@jiscribe/canvas-sdk";
import { TextOverlayFrame } from "@jiscribe/canvas-sdk";
import { renderMarkdown } from "@jiscribe/markdown";
import type React from "react";
import { memo, useEffect, useMemo, useRef } from "react";

import { MarkdownBody } from "./MarkdownStyled";

const MarkdownOverlayComponent: React.FC<FrameTextOverlayProps> = ({
	x,
	y,
	width,
	height,
	transform,
	text,
	textAlign,
	verticalAlign,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	fontStyle,
	textDecoration,
	isEditing,
}) => {
	const bodyRef = useRef<HTMLDivElement>(null);

	// The source is Markdown, whose own syntax carries the styling, so a body
	// styled per range is flattened to its characters rather than drawn as runs.
	const source = text === undefined ? "" : richTextToPlain(text);

	// XSS sanitization is guaranteed by DOMPurify inside @jiscribe/markdown's
	// renderMarkdown. Responsibility for maintaining sanitization lies there.
	const renderedHtml = useMemo(
		() => (source ? renderMarkdown(source) : ""),
		[source],
	);

	// isEditing stays in deps: while editing this component renders null, so the
	// body div remounts on close and innerHTML must be set again even though
	// renderedHtml is unchanged.
	useEffect(() => {
		if (!bodyRef.current) {
			return;
		}
		bodyRef.current.innerHTML = renderedHtml;
	}, [renderedHtml, isEditing]);

	// While editing, the source is shown in the textarea; drawing here too would double it up.
	if (isEditing || source === "") {
		return null;
	}

	return (
		<TextOverlayFrame
			x={x}
			y={y}
			width={width}
			height={height}
			transform={transform}
			textAlign={textAlign}
			verticalAlign={verticalAlign}
			fontColor={fontColor}
			fontSize={fontSize}
			fontFamily={fontFamily}
			fontWeight={fontWeight}
			fontStyle={fontStyle}
			textDecoration={textDecoration}
		>
			<MarkdownBody ref={bodyRef} />
		</TextOverlayFrame>
	);
};

/** Draws the shape's `text` as rendered Markdown inside the shared text overlay box. */
export const MarkdownOverlay = memo(MarkdownOverlayComponent);
