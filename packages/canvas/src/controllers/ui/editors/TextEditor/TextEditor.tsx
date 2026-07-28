import type React from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { TextArea, TextEditorWrapper } from "./TextEditorStyled";
import { createSvgTransform } from "../../../../presentations/objects/utils/createSvgTransform";
import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import { verticalAlignToAlignItems } from "../../../../presentations/objects/utils/verticalAlignToAlignItems";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import type { TextEditOverflow } from "../ObjectTextEditOverflowTypes";

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
	/** Text region height (from calcTextRegion); a cap when `overflow` is "scroll", a minimum when it is "grow" */
	height: number;
	/** What happens when the typed text outgrows `height` (see ObjectTextEditOverflowRegistry) */
	overflow: TextEditOverflow;
	scaleX: number;
	scaleY: number;
	rotation: number;
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
	overflow,
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

	// The region offset (x/y) rides inside the transform, after the shape
	// matrix, mirroring TextOverlayFrame: left/top would be applied outside the
	// transform, which only agrees with the SVG side while the region is
	// centered on the shape's local origin.
	const transform = `${createSvgTransform(scaleX, scaleY, rotation, cx, cy)} translate(${x}px, ${y}px)`;

	return (
		<TextEditorWrapper
			data-testid="text-editor"
			data-gesture="none"
			style={{
				width,
				// "scroll" pins the box to the region and lets the textarea's own
				// max-height clip it; "grow" takes the region as a floor and extends
				// downward from its top edge (growth direction independent of
				// verticalAlign).
				height: overflow === "scroll" ? height : undefined,
				minHeight: overflow === "grow" ? height : undefined,
				transform,
				alignItems: verticalAlignToAlignItems[verticalAlign],
			}}
			onPointerDown={handleWrapperPointerDown}
		>
			<TextArea
				data-gesture="native-wheel"
				value={text}
				style={{
					// Only a "scroll" slot is capped, and only a capped textarea ever
					// overflows — which is also what makes native-wheel take over
					// (shouldUseNativeWheel tests scrollability).
					maxHeight: overflow === "scroll" ? "100%" : undefined,
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
