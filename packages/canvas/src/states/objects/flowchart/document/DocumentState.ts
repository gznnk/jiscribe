import type { DocumentFeatures } from "../../../../schemas/objects/flowchart/document/DocumentDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DocumentStateBrand: unique symbol;

export type DocumentState = CreateObjectState<
	typeof DocumentFeatures,
	typeof DocumentStateBrand
>;
