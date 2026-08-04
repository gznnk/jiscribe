import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameObjectDefinition } from "@workspace/canvas-sdk";

import { markdownDocDefinition } from "./doc";
import { Markdown } from "./presentation/Markdown";
import type { MarkdownDoc } from "./schema/MarkdownDoc";
import type { MarkdownState } from "./state/MarkdownState";
import { MarkdownStencils } from "./stencil/MarkdownStencils";

/**
 * The markdown card behaves exactly like a Rect apart from how its body is
 * drawn, so `textRegion` (full bbox), `outline` (bbox rect), and `menu`
 * (derived from features) are all left at the defaults.
 */
export const markdownDefinition: ObjectTypeDefinition<
	MarkdownDoc,
	MarkdownState
> = createFrameObjectDefinition<MarkdownDoc, MarkdownState>({
	doc: markdownDocDefinition,
	component: Markdown,
	stencils: MarkdownStencils,
});
