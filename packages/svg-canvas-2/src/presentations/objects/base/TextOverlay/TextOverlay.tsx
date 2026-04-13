import { negativeToZero } from "@workspace/geometry";
import { renderMarkdown } from "@workspace/markdown";
import type React from "react";
import { memo, useEffect, useRef } from "react";

import { ForeignObjectElement, Text, TextWrapper } from "./TextOverlayStyled";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { TextType } from "../../../../schemas/objects/types/TextType";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";

type TextOverlayProps = {
	// Position and size (relative to parent shape's center)
	x: number;
	y: number;
	width: number;
	height: number;
	// Transform (same as parent shape)
	transform: string;
	// Text style properties
	text?: string;
	textType?: TextType;
	textAlign?: TextAlign;
	verticalAlign?: VerticalAlign;
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
};

const TextOverlayComponent: React.FC<TextOverlayProps> = ({
	x,
	y,
	width,
	height,
	transform,
	text,
	textType = "textarea",
	textAlign = "center",
	verticalAlign = "center",
	fontColor = "#000000",
	fontSize = 16,
	fontFamily = "Noto Sans JP",
	fontWeight = "normal",
}) => {
	const textRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (textRef.current && textType === "markdown" && text) {
			// Clear the previous content
			textRef.current.innerHTML = "";
			// Set the new content with sanitized HTML
			textRef.current.innerHTML = renderMarkdown(text);
		}
	}, [text, textType]);

	// Don't render anything if text is empty
	if (!text) return null;

	return (
		<ForeignObjectElement
			x={x}
			y={y}
			width={negativeToZero(width)}
			height={negativeToZero(height)}
			transform={transform}
			pointerEvents="none"
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

export const TextOverlay = memo(TextOverlayComponent);
