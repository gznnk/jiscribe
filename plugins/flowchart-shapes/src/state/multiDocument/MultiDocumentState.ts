import type { CreateObjectState } from "@workspace/canvas";

import type { MultiDocumentFeatures } from "../../schema/multiDocument/MultiDocumentDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MultiDocumentStateBrand: unique symbol;

export type MultiDocumentState = CreateObjectState<
	typeof MultiDocumentFeatures,
	typeof MultiDocumentStateBrand
>;
