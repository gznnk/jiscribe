import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { FolderFeatures } from "./FolderDoc";

/** Validates a FolderDoc (Frame-family shared logic generated from features). */
export const validateFolderDoc: ObjectDocValidateFn =
	createFrameDocValidator(FolderFeatures);
