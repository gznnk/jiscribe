import { createFrameMapper } from "@workspace/canvas-sdk";

import type { MarkdownState } from "./MarkdownState";
import type { MarkdownDoc } from "../schema/MarkdownDoc";
import { MarkdownFeatures } from "../schema/MarkdownDoc";

/** MarkdownDoc ↔ MarkdownState conversion (Frame-family shared logic generated from features). */
export const { toState: markdownToState, toDoc: markdownToDoc } =
	createFrameMapper<MarkdownDoc, MarkdownState>(MarkdownFeatures);
