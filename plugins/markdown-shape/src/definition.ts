import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { markdownDocDefinition } from "./doc";
import { Markdown } from "./presentation/Markdown";
import { measureMarkdownText } from "./presentation/measureMarkdownText";
import type { MarkdownDoc } from "./schema/MarkdownDoc";
import type { MarkdownState } from "./state/MarkdownState";
import { MarkdownStencils } from "./stencil/MarkdownStencils";

/**
 * The markdown card behaves exactly like a Rect apart from how its body is
 * drawn — and so measured (`textMeasurer`) — so its doc's `textRegion` is the
 * full bbox, and `outline` (bbox rect) and `menu` (derived from features) are
 * left at the defaults.
 */
export const markdownDefinition: ObjectTypeDefinition<
	MarkdownDoc,
	MarkdownState
> = createFrameObjectDefinition<MarkdownDoc, MarkdownState>({
	doc: markdownDocDefinition,
	component: Markdown,
	stencils: MarkdownStencils,
	textMeasurer: measureMarkdownText,
});
