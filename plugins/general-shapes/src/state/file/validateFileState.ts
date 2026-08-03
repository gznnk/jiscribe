import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { FileFeatures } from "../../schema/file/FileDoc";

/** Validates FileState (Frame-family common logic generated from features). */
export const isValidFileState: ObjectStateValidator =
	createFrameStateValidator(FileFeatures);
