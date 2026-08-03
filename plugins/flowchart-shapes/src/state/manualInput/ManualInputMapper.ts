import { createFrameMapper } from "@workspace/canvas-sdk";

import type { ManualInputState } from "./ManualInputState";
import type { ManualInputDoc } from "../../schema/manualInput/ManualInputDoc";
import { ManualInputFeatures } from "../../schema/manualInput/ManualInputDoc";

/** ManualInputDoc <-> ManualInputState conversion (Frame-family shared logic generated from features). */
export const { toState: manualInputToState, toDoc: manualInputToDoc } =
	createFrameMapper<ManualInputDoc, ManualInputState>(ManualInputFeatures);
