import type React from "react";
import { memo, useEffect, useRef } from "react";

import { TextArea } from "./TextEditorStyled";
import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { TextType } from "../../../../schemas/objects/types/TextType";

type TextEditorProps = {
	objectId: string;
	text: string;
	cx: number;
	cy: number;
	width: number;
	height: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
	textType?: TextType;
	textAlign?: TextAlign;
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	onChange: (text: string) => void;
	onEscape?: () => void;
};

const TextEditorComponent: React.FC<TextEditorProps> = ({
	text,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	textAlign = "center",
	fontColor = "#000000",
	fontSize = 16,
	fontFamily = "Noto Sans JP",
	fontWeight = "normal",
	onChange,
	onEscape,
}) => {
	const textAreaRef = useRef<HTMLTextAreaElement>(null);

	// 初回フォーカス
	useEffect(() => {
		textAreaRef.current?.focus();
		// Set cursor to the end of the text
		textAreaRef.current?.setSelectionRange(text.length, text.length);
	}, [text.length]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Escape" && onEscape) {
			e.preventDefault();
			e.stopPropagation();
			onEscape();
		}
	};

	// Calculate position and transform
	// Position: element's center at origin (will be moved by matrix transform)
	const x = -width / 2;
	const y = -height / 2;
	// Transform: SVG matrix with rotation, scale, and translation to (cx, cy)
	const transform = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	const commonProps = {
		value: text,
		left: x,
		top: y,
		width,
		height,
		transform,
		textAlign,
		color: fontColor,
		fontSize,
		fontFamily,
		fontWeight,
		onChange: handleChange,
		onKeyDown: handleKeyDown,
	};

	return (
		<TextArea
			data-kind="text-editor"
			data-id="textarea"
			{...commonProps}
			ref={textAreaRef}
		/>
	);
};

export const TextEditor = memo(TextEditorComponent);
