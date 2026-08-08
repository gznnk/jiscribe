import type { CreateObjectState } from "@workspace/canvas";

import type { FolderFeatures } from "../../schema/folder/FolderDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const FolderStateBrand: unique symbol;

export type FolderState = CreateObjectState<
	typeof FolderFeatures,
	typeof FolderStateBrand
>;
