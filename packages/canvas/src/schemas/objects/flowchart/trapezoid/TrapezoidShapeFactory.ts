import { TRAPEZOID_DOC_DEFAULTS } from "./TrapezoidDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Trapezoid shapes (Frame-family shared logic generated from defaults). */
export const TrapezoidShapeFactory = createFrameShapeFactory(
	TRAPEZOID_DOC_DEFAULTS,
);
