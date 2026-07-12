import { SUBROUTINE_DOC_DEFAULTS } from "./SubroutineDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Subroutine shapes (Frame-family shared logic generated from defaults). */
export const SubroutineShapeFactory = createFrameShapeFactory(
	SUBROUTINE_DOC_DEFAULTS,
);
