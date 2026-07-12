import { PARALLELOGRAM_DOC_DEFAULTS } from "./ParallelogramDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Parallelogram shapes (Frame-family shared logic generated from defaults). */
export const ParallelogramShapeFactory = createFrameShapeFactory(
	PARALLELOGRAM_DOC_DEFAULTS,
);
