import type { ManualInputState } from "./ManualInputState";
import type { ManualInputDoc } from "../../../../schemas/objects/primitives/manualInput/ManualInputDoc";
import { ManualInputFeatures } from "../../../../schemas/objects/primitives/manualInput/ManualInputDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** ManualInputDoc <-> ManualInputState conversion (Frame-family shared logic generated from features). */
export const { toState: manualInputToState, toDoc: manualInputToDoc } =
	createFrameMapper<ManualInputDoc, ManualInputState>(ManualInputFeatures);
