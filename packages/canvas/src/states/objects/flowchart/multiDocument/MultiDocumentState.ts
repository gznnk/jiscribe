import type { MultiDocumentFeatures } from "../../../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MultiDocumentStateBrand: unique symbol;

export type MultiDocumentState = CreateObjectState<
	typeof MultiDocumentFeatures,
	typeof MultiDocumentStateBrand
>;
