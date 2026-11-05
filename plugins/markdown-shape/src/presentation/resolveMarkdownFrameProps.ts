import type {
	FrameTextOverlayProps,
	TextOverlayFrameProps,
} from "@jiscribe/canvas-sdk";

import { calcMarkdownMaxFontScale } from "./calcMarkdownMaxFontScale";

/** The slot typography the markdown body is drawn with. */
type MarkdownBodyTypography = Pick<
	FrameTextOverlayProps,
	"textAlign" | "verticalAlign" | "fontColor" | "fontSize" | "fontFamily"
>;

/**
 * The TextOverlayFrame props the markdown body is drawn in, apart from the box
 * and the body itself. The overlay and the measurer both take them from here,
 * so the box that is measured is the box that is drawn.
 *
 * @param typography - The slot's style, resolved against the type's defaults
 * @param renderedHtml - The body as `renderMarkdown` renders it, read for the
 *   largest heading it holds; "" for an empty body
 */
export const resolveMarkdownFrameProps = (
	typography: MarkdownBodyTypography,
	renderedHtml: string,
): Omit<
	TextOverlayFrameProps,
	"x" | "y" | "width" | "height" | "transform" | "children"
> => ({
	textAlign: typography.textAlign,
	verticalAlign: typography.verticalAlign,
	fontColor: typography.fontColor,
	fontSize: typography.fontSize,
	// Headings are scaled in `em` of fontSize; with no fontSize the frame's
	// own default applies to both.
	maxFontSize:
		typography.fontSize === undefined
			? undefined
			: typography.fontSize * calcMarkdownMaxFontScale(renderedHtml),
	fontFamily: typography.fontFamily,
	exportAs: "html",
});
