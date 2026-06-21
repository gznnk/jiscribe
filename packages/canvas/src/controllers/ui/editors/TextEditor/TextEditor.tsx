import type React from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { TextArea, TextEditorWrapper } from "./TextEditorStyled";
import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";
import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
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

	// auto（テーマ追従）をテーマ前景（ink）へ解決する。描画側 TextOverlay と同じ resolver
	// を使い、同じ色になるようにする（issue #38）。
	const resolvedColor = resolveAutoColor(fontColor, "ink");

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

	// テキスト外の余白クリックでフォーカスが外れないようにする。
	// ジェスチャーシステムからの除外は data-gesture="none" が担う。
	const handleWrapperPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (e.target === e.currentTarget) {
				e.preventDefault();
				textAreaRef.current?.focus();
			}
		},
		[],
	);

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
			data-gesture="none"
			left={x}
			top={y}
			width={width}
			height={height}
			transform={transform}
			verticalAlign={verticalAlign}
			onPointerDown={handleWrapperPointerDown}
		>
			<TextArea
				data-gesture="native-wheel"
				value={text}
				textAlign={textAlign}
				color={resolvedColor}
				fontSize={fontSize}
				fontFamily={fontFamily}
				fontWeight={fontWeight}
				ref={textAreaRef}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
			/>
		</TextEditorWrapper>
	);
};

export const TextEditor = memo(TextEditorComponent);
