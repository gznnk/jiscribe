import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { markdownDocDefinition } from "./doc";
import { Markdown } from "./presentation/Markdown";
import type { MarkdownDoc } from "./schema/MarkdownDoc";
import { markdownToDoc, markdownToState } from "./state/MarkdownMapper";
import type { MarkdownState } from "./state/MarkdownState";
import { isValidMarkdownState } from "./state/validateMarkdownState";
import { MarkdownStencils } from "./stencil/MarkdownStencils";

/**
 * The markdown card behaves exactly like a Rect apart from how its body is
 * drawn, so `textRegion` (full bbox), `outline` (bbox rect), and `menu`
 * (derived from features) are all left at the defaults.
 */
export const markdownDefinition: ObjectTypeDefinition<
	MarkdownDoc,
	MarkdownState
> = {
	...markdownDocDefinition,
	mapper: { toDoc: markdownToDoc, toState: markdownToState },
	stateValidator: isValidMarkdownState,
	component: Markdown,
	behavior: createFrameBehavior<MarkdownState>(),
	stencils: MarkdownStencils,
};
