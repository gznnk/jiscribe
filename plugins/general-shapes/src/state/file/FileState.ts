import type { CreateObjectState } from "@jiscribe/canvas";

import type { FileFeatures } from "../../schema/file/FileDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const FileStateBrand: unique symbol;

export type FileState = CreateObjectState<
	typeof FileFeatures,
	typeof FileStateBrand
>;
