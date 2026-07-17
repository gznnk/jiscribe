import { LOOP_LIMIT_DOC_DEFAULTS } from "./LoopLimitDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating LoopLimit shapes (Frame-family shared logic generated from defaults). */
export const LoopLimitShapeFactory = createFrameShapeFactory(
	LOOP_LIMIT_DOC_DEFAULTS,
);
