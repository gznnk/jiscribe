import { createFrameMapper } from "@workspace/canvas-sdk";

import type { DocumentState } from "./DocumentState";
import type { DocumentDoc } from "../../schema/document/DocumentDoc";
import { DocumentFeatures } from "../../schema/document/DocumentDoc";

/** DocumentDoc ↔ DocumentState conversion (Frame-family shared logic generated from features). */
export const { toState: documentToState, toDoc: documentToDoc } =
	createFrameMapper<DocumentDoc, DocumentState>(DocumentFeatures);
