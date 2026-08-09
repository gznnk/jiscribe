import type { CreateObjectState } from "@jiscribe/canvas";

import type { MultiDocumentFeatures } from "../../schema/multiDocument/MultiDocumentDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MultiDocumentStateBrand: unique symbol;

export type MultiDocumentState = CreateObjectState<
	typeof MultiDocumentFeatures,
	typeof MultiDocumentStateBrand
>;
