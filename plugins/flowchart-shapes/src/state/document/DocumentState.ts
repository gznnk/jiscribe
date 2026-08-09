import type { CreateObjectState } from "@jiscribe/canvas";

import type { DocumentFeatures } from "../../schema/document/DocumentDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DocumentStateBrand: unique symbol;

export type DocumentState = CreateObjectState<
	typeof DocumentFeatures,
	typeof DocumentStateBrand
>;
