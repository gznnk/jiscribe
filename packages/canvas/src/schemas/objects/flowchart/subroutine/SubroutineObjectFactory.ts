import { SUBROUTINE_DOC_DEFAULTS } from "./SubroutineDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Subroutine shapes (Frame-family shared logic generated from defaults). */
export const SubroutineObjectFactory = createFrameObjectFactory(
	SUBROUTINE_DOC_DEFAULTS,
);
