import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { FolderFeatures } from "../../schema/folder/FolderDoc";

/** Validates FolderState (Frame-family common logic generated from features). */
export const isValidFolderState: ObjectStateValidator =
	createFrameStateValidator(FolderFeatures);
