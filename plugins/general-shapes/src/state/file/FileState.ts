import type { CreateObjectState } from "@workspace/canvas";

import type { FileFeatures } from "../../schema/file/FileDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const FileStateBrand: unique symbol;

export type FileState = CreateObjectState<
	typeof FileFeatures,
	typeof FileStateBrand
>;
