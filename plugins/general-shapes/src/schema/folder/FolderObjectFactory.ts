import { createFrameObjectFactory } from "@workspace/canvas-sdk/doc";

import { FOLDER_DOC_DEFAULTS } from "./FolderDoc";

/** Factory for creating Folder shapes (Frame-family shared logic generated from defaults). */
export const FolderObjectFactory =
	createFrameObjectFactory(FOLDER_DOC_DEFAULTS);
