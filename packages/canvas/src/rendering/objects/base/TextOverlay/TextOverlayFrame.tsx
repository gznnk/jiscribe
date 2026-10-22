import type { TextAlign } from "@jiscribe/doc/model/objects/types/text/TextAlign";
import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/text/VerticalAlign";
import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/text/style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";
import { negativeToZero } from "@jiscribe/geometry";
import type React from "react";
import type { ReactNode } from "react";

import {
	ForeignObjectElement,
	TextContent,
	TextWrapper,
} from "./TextOverlayFrameStyled";
import { useIsTextLegible } from "../../useIsTextLegible";
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
	/**
	 * SVG transform matrix of the parent shape (createSvgTransform output).
	 * Omitted when an enclosing group already carries it, as createFrameObject's
	 * overlays do, so a move changes that group's attribute and no overlay's.
	 */
	transform?: string;
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
	/**
	 * The largest type size anything inside the box is drawn at, in pixels at
	 * zoom 1, when the content draws parts of itself larger than `fontSize` (runs
	 * set larger, a heading scaled by `em`). Default: `fontSize`. The box is not
	 * drawn while this times the canvas zoom is below 4 CSS px, except while an
	 * export clones the canvas (useIsTextLegible).
	 */
	maxFontSize?: number;
	/** Font family; falls back to DEFAULT_FONT_FAMILY when omitted, which is where it lives rather than in TEXT_STYLE_FALLBACK because doc creation shares it. */
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
 * Text too small to read at the canvas's zoom is hidden with `display="none"`
 * rather than unmounted, so zooming back in does not remount every box at once.
 *
 * The DOM shape is load-bearing: `foreignObject > wrapper > content`. Image
 * export walks exactly these two levels and reads the computed style off the
 * content element (see foreignObjectToSvgText), so children must nest *inside*
 * the content element, never between the levels.
 *
 * Deliberately not memoized: `children` is a JSX element every caller builds
 * fresh per render, so a memo here could never bail out — the effective memo
 * boundary is the caller (TextOverlay, or the type's own overlay renderer).
 */
export const TextOverlayFrame: React.FC<TextOverlayFrameProps> = ({
	x,
	y,
	width,
	height,
	transform,
	textAlign = TEXT_STYLE_FALLBACK.textAlign,
	verticalAlign = TEXT_STYLE_FALLBACK.verticalAlign,
	fontColor = TEXT_STYLE_FALLBACK.fontColor,
	fontSize = TEXT_STYLE_FALLBACK.fontSize,
	maxFontSize = fontSize,
	fontFamily = DEFAULT_FONT_FAMILY,
	fontWeight = TEXT_STYLE_FALLBACK.fontWeight,
	fontStyle = TEXT_STYLE_FALLBACK.fontStyle,
	textDecoration = TEXT_STYLE_FALLBACK.textDecoration,
	children,
}) => {
	// Resolve auto (theme-following) to the theme foreground (ink) (issue #38).
	const resolvedColor = resolveAutoColor(fontColor, "ink");
	const isLegible = useIsTextLegible(maxFontSize);

	return (
		<ForeignObjectElement
			// The region offset rides on the transform instead of x/y: Chromium
			// rasterizes a foreignObject's HTML at its box position rounded to whole
			// pixels, and rounding `y` on its own breaks the cancellation between the
			// region offset (-height/2 + band) and the shape's translate (center).
			// Both carry half the height, so during a resize each changes by a
			// fraction while their sum stays put — and the text flickered by 1px
			// every time the center crossed a pixel. As a transform, the offset is
			// composed with the shape's before any rounding, whether the shape's
			// rides on the same attribute or on an enclosing group, so the text holds
			// still.
			x={0}
			y={0}
			width={negativeToZero(width)}
			height={negativeToZero(height)}
			transform={
				transform === undefined
					? `translate(${x} ${y})`
					: `${transform} translate(${x} ${y})`
			}
			pointerEvents="none"
			display={isLegible ? undefined : "none"}
		>
			<TextWrapper
				style={{ alignItems: verticalAlignToAlignItems[verticalAlign] }}
			>
				<TextContent
					style={{
						textAlign,
						color: resolvedColor,
						fontSize,
						fontFamily,
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
