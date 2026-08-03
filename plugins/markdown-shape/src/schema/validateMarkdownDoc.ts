import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { MarkdownFeatures } from "./MarkdownDoc";

/** Validates a MarkdownDoc (Frame-family shared logic generated from features). */
export const validateMarkdownDoc: ObjectDocValidateFn =
	createFrameDocValidator(MarkdownFeatures);
