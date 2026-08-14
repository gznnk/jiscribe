import { negativeToZero } from "@jiscribe/geometry";
import type React from "react";
import type { ReactNode } from "react";
import { memo } from "react";

import {
	ForeignObjectElement,
	TextContent,
	TextWrapper,
} from "./TextOverlayFrameStyled";
import { TEXT_STYLE_FALLBACK } from "../../../../constants/textStyleFallback";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import { resolveAutoColor } from "../../utils/resolveAutoColor";
import { verticalAlignToAlignItems } from "../../utils/verticalAlignToAlignItems";

export type TextOverlayFrameProps = {
	/** Text region left edge in the shape's local coordinates (from calcTextRegion). */
	x: number;
	/** Text region top edge in the shape's local coordinates (from calcTextRegion). */
	y: number;
	/** Text region width; negative values are clamped to 0. */
	width: number;
	/** Text region height; negative values are clamped to 0. */
	height: number;
	/** SVG transform matrix of the parent shape (createSvgTransform output). */
	transform: string;
	/**
	 * Horizontal alignment of the content. Pass the value resolved against the
	 * shape type's own defaults (ObjectTextStyleDefaultsRegistry); omitted, this
	 * box knows no type and falls back to TEXT_STYLE_FALLBACK ("center").
	 */
	textAlign?: TextAlign;
	/** Vertical placement of the content block inside the region. Default: TEXT_STYLE_FALLBACK ("middle"). */
	verticalAlign?: VerticalAlign;
	/** CSS color, or `"auto"` to follow the theme foreground. Default: TEXT_STYLE_FALLBACK ("#000000"). */
	fontColor?: string;
	/** Font size in pixels. Default: TEXT_STYLE_FALLBACK (16). */
	fontSize?: number;
	/** Font family; falls back to the canvas theme font when omitted, which is a property of the viewer and so absent from TEXT_STYLE_FALLBACK. */
	fontFamily?: string;
	/** CSS font-weight. Default: TEXT_STYLE_FALLBACK ("normal"). */
	fontWeight?: string;
	/** CSS font-style ("normal" / "italic"). Default: TEXT_STYLE_FALLBACK ("normal"). */
	fontStyle?: string;
	/** CSS text-decoration-line ("underline" / "line-through", space-separated). Default: TEXT_STYLE_FALLBACK ("none"). */
	textDecoration?: string;
	/** Content drawn inside the box — a text node, or an element that renders its own markup. */
	children: ReactNode;
};

const TextOverlayFrameComponent: React.FC<TextOverlayFrameProps> = ({
	x,
	y,
	width,
	height,
	transform,
	textAlign = TEXT_STYLE_FALLBACK.textAlign,
	verticalAlign = TEXT_STYLE_FALLBACK.verticalAlign,
	fontColor = TEXT_STYLE_FALLBACK.fontColor,
	fontSize = TEXT_STYLE_FALLBACK.fontSize,
	fontFamily,
	fontWeight = TEXT_STYLE_FALLBACK.fontWeight,
	fontStyle = TEXT_STYLE_FALLBACK.fontStyle,
	textDecoration = TEXT_STYLE_FALLBACK.textDecoration,
	children,
}) => {
	// Docs of text-bearing shapes always carry fontFamily; the theme font is a
	// safety net for callers that omit it.
	const { fontFamily: themeFontFamily } = useCanvasTheme();
	const resolvedFontFamily = fontFamily ?? themeFontFamily;
	// Resolve auto (theme-following) to the theme foreground (ink) (issue #38).
	const resolvedColor = resolveAutoColor(fontColor, "ink");

	return (
		<ForeignObjectElement
			// The region offset rides on the transform instead of x/y: Chromium
			// rasterizes a foreignObject's HTML at its box position rounded to whole
			// pixels, and rounding `y` on its own breaks the cancellation between the
			// region offset (-height/2 + band) and the shape's translate (center).
			// Both carry half the height, so during a resize each changes by a
			// fraction while their sum stays put — and the text flickered by 1px
			// every time the center crossed a pixel. Folded into one transform, the
			// sum is computed before any rounding, so the text holds still.
			x={0}
			y={0}
			width={negativeToZero(width)}
			height={negativeToZero(height)}
			transform={`${transform} translate(${x} ${y})`}
			pointerEvents="none"
		>
			<TextWrapper
				style={{ alignItems: verticalAlignToAlignItems[verticalAlign] }}
			>
				<TextContent
					style={{
						textAlign,
						color: resolvedColor,
						fontSize,
						fontFamily: resolvedFontFamily,
						fontWeight,
						fontStyle,
						textDecoration,
					}}
				>
					{children}
				</TextContent>
			</TextWrapper>
		</ForeignObjectElement>
	);
};

/**
 * The box every text overlay is drawn in: a foreignObject placed and transformed
 * with the parent shape, holding one content element that carries the shared
 * typography contract (line-height, padding, alignment, resolved color/font).
 *
 * The same contract has to hold on the editing side (TextEditor lays its
 * editable surface over the identical region), so display and edit must not drift apart
 * — which is why this box lives here rather than in each shape. Shapes that draw
 * something other than plain text (Markdown, for one) render their own element
 * as `children` instead of duplicating the box.
 *
 * The DOM shape is load-bearing: `foreignObject > wrapper > content`. Image
 * export walks exactly these two levels and reads the computed style off the
 * content element (see foreignObjectToSvgText), so children must nest *inside*
 * the content element, never between the levels.
 */
export const TextOverlayFrame = memo(TextOverlayFrameComponent);
