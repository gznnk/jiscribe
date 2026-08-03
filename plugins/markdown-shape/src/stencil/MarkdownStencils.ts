import type { Stencil } from "@workspace/canvas";
import { createTypeStencils } from "@workspace/canvas-sdk";

import { MarkdownIcon } from "./MarkdownIcon";

export const MarkdownStencils: Stencil[] = createTypeStencils({
	objectType: "markdown",
	label: { en: "Markdown", ja: "Markdown" },
	icon: MarkdownIcon,
	// Size, alignment, and colors are type defaults (MARKDOWN_DOC_DEFAULTS);
	// only the sample body belongs to the palette — a shape created by AI or
	// by hand starts empty.
	defaultOverrides: { text: "# Title\n\nWrite **markdown** here." },
});
