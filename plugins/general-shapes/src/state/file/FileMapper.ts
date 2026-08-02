import { createFrameMapper } from "@workspace/canvas/unstable";

import type { FileState } from "./FileState";
import type { FileDoc } from "../../schema/file/FileDoc";
import { FileFeatures } from "../../schema/file/FileDoc";

/** FileDoc <-> FileState conversion (Frame-family shared logic generated from features). */
export const { toState: fileToState, toDoc: fileToDoc } = createFrameMapper<
	FileDoc,
	FileState
>(FileFeatures);
