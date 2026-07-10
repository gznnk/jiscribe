import type React from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { TextArea, TextEditorWrapper } from "./TextEditorStyled";
import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";
import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import { verticalAlignToAlignItems } from "../../../../presentations/objects/utils/verticalAlignToAlignItems";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { TextType } from "../../../../schemas/objects/types/TextType";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";

type TextEditorProps = {
	objectId: string;
	text: string;
	cx: number;
	cy: number;
	/** Text region top-left X in the object's local coordinates (from calcTextRegion) */
	x: number;
	/** Text region top-left Y in the object's local coordinates (from calcTextRegion) */
	y: number;
	/** Text region width (from calcTextRegion) */
	width: number;
	/** Text region height (from calcTextRegion) */
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
	x,
	y,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	textAlign = "center",
	verticalAlign = "middle",
	fontColor = "#000000",
	fontSize = 16,
	fontFamily,
	fontWeight = "normal",
	onChange,
	onEscape,
}) => {
	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	// Docs of text-bearing shapes always carry fontFamily; the theme font is a
	// safety net for callers that omit it.
	const { fontFamily: themeFontFamily } = useCanvasTheme();
	const resolvedFontFamily = fontFamily ?? themeFontFamily;

	// Resolve auto (theme-following) to the theme foreground (ink). Use the same
	// resolver as the rendering-side TextOverlay so the color matches (issue #38).
	const resolvedColor = resolveAutoColor(fontColor, "ink");

	// Initial focus
	useEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
	}, []);

	// Update the height to match the text amount (vertical alignment is applied via the wrapper's flex)
	useLayoutEffect(() => {
		const el = textAreaRef.current;
		if (!el) {
			return;
		}
		el.style.height = "0px";
		el.style.height = `${el.scrollHeight}px`;
	}, [text, width, height, fontSize, resolvedFontFamily, fontWeight]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e.target.value);
	};

	// Prevent losing focus when clicking the margin outside the text.
	// Exclusion from the gesture system is handled by data-gesture="none".
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

	// Transform: SVG matrix with rotation, scale, and translation to (cx, cy).
	// x/y position the region in local coordinates before this transform is applied.
	const transform = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	return (
		<TextEditorWrapper
			data-testid="text-editor"
			data-gesture="none"
			style={{
				left: x,
				top: y,
				width,
				height,
				transform,
				alignItems: verticalAlignToAlignItems[verticalAlign],
			}}
			onPointerDown={handleWrapperPointerDown}
		>
			<TextArea
				data-gesture="native-wheel"
				value={text}
				style={{
					textAlign,
					color: resolvedColor,
					fontSize,
					fontFamily: resolvedFontFamily,
					fontWeight,
				}}
				ref={textAreaRef}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
			/>
		</TextEditorWrapper>
	);
};

/** In-place textarea overlay for editing an object's text, positioned and transformed to match the object. */
export const TextEditor = memo(TextEditorComponent);
