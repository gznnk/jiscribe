import { MANUAL_INPUT_DOC_DEFAULTS } from "./ManualInputDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating ManualInput shapes (Frame-family shared logic generated from defaults). */
export const ManualInputObjectFactory = createFrameObjectFactory(
	MANUAL_INPUT_DOC_DEFAULTS,
);
