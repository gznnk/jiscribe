import { MANUAL_INPUT_DOC_DEFAULTS } from "./ManualInputDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating ManualInput shapes (Frame-family shared logic generated from defaults). */
export const ManualInputShapeFactory = createFrameShapeFactory(
	MANUAL_INPUT_DOC_DEFAULTS,
);
