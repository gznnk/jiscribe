import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { MarkdownFeatures } from "./MarkdownDoc";

/** Validates a MarkdownDoc (Frame-family shared logic generated from features). */
export const validateMarkdownDoc: ObjectDocValidateFn =
	createFrameDocValidator(MarkdownFeatures);
