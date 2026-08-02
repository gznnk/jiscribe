import { createFrameMapper } from "@workspace/canvas/unstable";

import type { FolderState } from "./FolderState";
import type { FolderDoc } from "../../schema/folder/FolderDoc";
import { FolderFeatures } from "../../schema/folder/FolderDoc";

/** FolderDoc <-> FolderState conversion (Frame-family shared logic generated from features). */
export const { toState: folderToState, toDoc: folderToDoc } = createFrameMapper<
	FolderDoc,
	FolderState
>(FolderFeatures);
