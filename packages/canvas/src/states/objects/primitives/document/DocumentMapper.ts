import type { DocumentState } from "./DocumentState";
import type { DocumentDoc } from "../../../../schemas/objects/primitives/document/DocumentDoc";
import { DocumentFeatures } from "../../../../schemas/objects/primitives/document/DocumentDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** DocumentDoc ↔ DocumentState conversion (Frame-family shared logic generated from features). */
export const { toState: documentToState, toDoc: documentToDoc } =
	createFrameMapper<DocumentDoc, DocumentState>(DocumentFeatures);
