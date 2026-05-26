import { negativeToZero } from "@workspace/geometry";
import { renderMarkdown } from "@workspace/markdown";
import type React from "react";
import { memo, useEffect, useRef } from "react";

import { ForeignObjectElement, Text, TextWrapper } from "./TextableStyled";
import type { TextableState } from "../../../../types/state/core/TextableState";

/**
 * Props for rendering editable text inside the SVG shape.
 */
type TextableProps = TextableState & {
	x: number;
	y: number;
	width: number;
	height: number;
	transform: string;
};

/**
 * React component for rendering editable text inside the SVG shape.
 */
const TextableComponent: React.FC<TextableProps> = ({
	x,
	y,
	width,
	height,
	transform,
	text,
	textType,
	textAlign,
	verticalAlign,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	isTextEditing,
}) => {
	const textRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (textRef.current && !isTextEditing) {
			// Clear the previous content
			textRef.current.innerHTML = "";
			// Set the new content with sanitized HTML
			textRef.current.innerHTML = renderMarkdown(text);
		}
	}, [text, isTextEditing]);

	if (!text) {
		return null;
	}
	if (isTextEditing) {
		return null;
	}

	return (
		<ForeignObjectElement
			x={x}
			y={y}
			width={negativeToZero(width)}
			height={negativeToZero(height)}
			transform={transform}
			pointerEvents="none"
			isTransparent={false}
		>
			<TextWrapper verticalAlign={verticalAlign}>
				{textType === "markdown" ? (
					<Text
						textAlign={textAlign}
						color={fontColor}
						fontSize={fontSize}
						fontFamily={fontFamily}
						fontWeight={fontWeight}
						wordBreak="normal"
						whiteSpace="normal"
						ref={textRef}
					/>
				) : (
					<Text
						textAlign={textAlign}
						color={fontColor}
						fontSize={fontSize}
						fontFamily={fontFamily}
						fontWeight={fontWeight}
						wordBreak={textType === "text" ? "normal" : "break-word"}
						whiteSpace={textType === "text" ? "nowrap" : "pre-wrap"}
					>
						{text}
					</Text>
				)}
			</TextWrapper>
		</ForeignObjectElement>
	);
};

export const Textable = memo(TextableComponent);
