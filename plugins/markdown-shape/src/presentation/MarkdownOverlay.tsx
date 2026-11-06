import type { FrameTextOverlayProps } from "@jiscribe/canvas-sdk";
import { TextOverlayFrame } from "@jiscribe/canvas-sdk";
import { richTextToPlain } from "@jiscribe/doc";
import type React from "react";
import { memo, useEffect, useMemo, useRef } from "react";

import { MarkdownBody } from "./MarkdownStyled";
import { renderMarkdownOverlayHtml } from "./renderMarkdownOverlayHtml";
import { resolveMarkdownFrameProps } from "./resolveMarkdownFrameProps";

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
	isEditing,
}) => {
	const bodyRef = useRef<HTMLDivElement>(null);

	// The body arrives as the string a source text is (SourceTextStyleDoc); the
	// overlay's prop type is the wider RichText every type shares.
	const source = text === undefined ? "" : richTextToPlain(text);

	// XSS sanitization is guaranteed by DOMPurify inside @jiscribe/markdown's
	// renderMarkdown. Responsibility for maintaining sanitization lies there.
	const renderedHtml = useMemo(
		() => renderMarkdownOverlayHtml(source, isEditing ?? false),
		[source, isEditing],
	);

	const frameProps = useMemo(
		() =>
			resolveMarkdownFrameProps(
				{ textAlign, verticalAlign, fontColor, fontSize, fontFamily },
				renderedHtml,
			),
		[textAlign, verticalAlign, fontColor, fontSize, fontFamily, renderedHtml],
	);

	useEffect(() => {
		if (!bodyRef.current) {
			return;
		}
		bodyRef.current.innerHTML = renderedHtml;
	}, [renderedHtml]);

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
			{...frameProps}
		>
			<MarkdownBody ref={bodyRef} />
		</TextOverlayFrame>
	);
};

/** Draws the shape's `text` as rendered Markdown inside the shared text overlay box. */
export const MarkdownOverlay = memo(MarkdownOverlayComponent);
