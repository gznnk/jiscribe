import type React from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { TextArea, TextEditorWrapper } from "./TextEditorStyled";
import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { TextType } from "../../../../schemas/objects/types/TextType";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";

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
	verticalAlign?: VerticalAlign;
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
	verticalAlign = "middle",
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
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
	}, []);

	// テキスト量に合わせて高さを更新（縦方向アライメントはラッパーの flex で適用）
	useLayoutEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		el.style.height = "0px";
		el.style.height = `${el.scrollHeight}px`;
	}, [text, width, height, fontSize, fontFamily, fontWeight]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e.target.value);
	};

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLElement>) => {
			e.stopPropagation();
		},
		[],
	);

	// テキスト外の余白クリックでフォーカスが外れないようにする
	const handleWrapperPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.stopPropagation();
			if (e.target === e.currentTarget) {
				e.preventDefault();
				textAreaRef.current?.focus();
			}
		},
		[],
	);

	const handleContextMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
		e.stopPropagation();
	}, []);

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

	return (
		<TextEditorWrapper
			data-kind="text-editor"
			data-id="textarea"
			left={x}
			top={y}
			width={width}
			height={height}
			transform={transform}
			verticalAlign={verticalAlign}
			onPointerDown={handleWrapperPointerDown}
			onContextMenu={handleContextMenu}
		>
			<TextArea
				data-native-wheel="true"
				value={text}
				textAlign={textAlign}
				color={fontColor}
				fontSize={fontSize}
				fontFamily={fontFamily}
				fontWeight={fontWeight}
				ref={textAreaRef}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onPointerDown={handlePointerDown}
			/>
		</TextEditorWrapper>
	);
};

export const TextEditor = memo(TextEditorComponent);
