import type { ObjectTextMeasurer } from "@jiscribe/canvas";
import type { TextSlots } from "@jiscribe/canvas-sdk";
import { measureTextOverlayContent, readTextSlot } from "@jiscribe/canvas-sdk";
import { renderMarkdown } from "@jiscribe/markdown";

import { MarkdownBody } from "./MarkdownStyled";
import { resolveMarkdownFrameProps } from "./resolveMarkdownFrameProps";
import type { MarkdownState } from "../state/MarkdownState";

/**
 * Measures the markdown body as the overlay draws it: rendered to HTML and laid
 * out off screen in the same frame (MarkdownOverlay), so headings, margins and
 * tables count. Blocks have no line count to report.
 */
export const measureMarkdownText: ObjectTextMeasurer<MarkdownState> = (
	object,
	slotId,
	{ regionSize, style },
) => {
	// CreateObjectState types a "source" type's state without the `text` the
	// mapper gives it (TextSlotsMapper), so it is read as the slots it holds.
	const source = readTextSlot((object as { text?: TextSlots }).text, slotId);
	const renderedHtml = source ? renderMarkdown(source) : "";
	const textSize = measureTextOverlayContent({
		width: regionSize.width,
		height: regionSize.height,
		...resolveMarkdownFrameProps(style, renderedHtml),
		// Set as markup rather than from an effect, as the overlay does, because
		// the box is read right after this synchronous render. The HTML is the
		// overlay's: DOMPurify inside renderMarkdown sanitizes it.
		children: (
			<MarkdownBody dangerouslySetInnerHTML={{ __html: renderedHtml }} />
		),
	});
	return { textSize, lineCount: null };
};
