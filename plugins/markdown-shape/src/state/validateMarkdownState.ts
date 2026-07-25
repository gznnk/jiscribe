import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { MarkdownFeatures } from "../schema/MarkdownDoc";

/** Validates MarkdownState (Frame-family common logic generated from features). */
export const isValidMarkdownState: ObjectStateValidator =
	createFrameStateValidator(MarkdownFeatures);
