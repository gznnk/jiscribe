import { TRAPEZOID_DOC_DEFAULTS } from "./TrapezoidDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Trapezoid shapes (Frame-family shared logic generated from defaults). */
export const TrapezoidObjectFactory = createFrameObjectFactory(
	TRAPEZOID_DOC_DEFAULTS,
);
