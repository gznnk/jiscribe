import type { FrameTextOverlayProps } from "@workspace/canvas/unstable";
import { TextOverlayFrame } from "@workspace/canvas/unstable";
import { renderMarkdown } from "@workspace/markdown";
import type React from "react";
import { memo, useEffect, useRef } from "react";

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
	isEditing,
}) => {
	const bodyRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!bodyRef.current) {
			return;
		}
		// XSS sanitization is guaranteed by DOMPurify inside @workspace/markdown's
		// renderMarkdown. Responsibility for maintaining sanitization lies there.
		bodyRef.current.innerHTML = text ? renderMarkdown(text) : "";
	}, [text, isEditing]);

	// While editing, the source is shown in the textarea; drawing here too would double it up.
	if (isEditing || !text) {
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
		>
			<MarkdownBody ref={bodyRef} />
		</TextOverlayFrame>
	);
};

/** Draws the shape's `text` as rendered Markdown inside the shared text overlay box. */
export const MarkdownOverlay = memo(MarkdownOverlayComponent);
