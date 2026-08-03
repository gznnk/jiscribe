import { createFrameMapper } from "@workspace/canvas-sdk";

import type { MultiDocumentState } from "./MultiDocumentState";
import type { MultiDocumentDoc } from "../../schema/multiDocument/MultiDocumentDoc";
import { MultiDocumentFeatures } from "../../schema/multiDocument/MultiDocumentDoc";

/** MultiDocumentDoc ↔ MultiDocumentState conversion (Frame-family shared logic generated from features). */
export const { toState: multiDocumentToState, toDoc: multiDocumentToDoc } =
	createFrameMapper<MultiDocumentDoc, MultiDocumentState>(
		MultiDocumentFeatures,
	);
