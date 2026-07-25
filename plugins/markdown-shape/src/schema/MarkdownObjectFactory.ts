import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import { MARKDOWN_DOC_DEFAULTS } from "./MarkdownDoc";

/** Factory for creating Markdown shapes (Frame-family shared logic generated from defaults). */
export const MarkdownObjectFactory = createFrameObjectFactory(
	MARKDOWN_DOC_DEFAULTS,
);
