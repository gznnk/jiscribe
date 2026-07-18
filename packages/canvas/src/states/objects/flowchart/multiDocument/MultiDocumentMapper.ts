import type { MultiDocumentState } from "./MultiDocumentState";
import type { MultiDocumentDoc } from "../../../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";
import { MultiDocumentFeatures } from "../../../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** MultiDocumentDoc ↔ MultiDocumentState conversion (Frame-family shared logic generated from features). */
export const { toState: multiDocumentToState, toDoc: multiDocumentToDoc } =
	createFrameMapper<MultiDocumentDoc, MultiDocumentState>(
		MultiDocumentFeatures,
	);
