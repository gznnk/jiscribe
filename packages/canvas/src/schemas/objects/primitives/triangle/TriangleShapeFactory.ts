import { TRIANGLE_DOC_DEFAULTS } from "./TriangleDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Triangle shapes (Frame-family shared logic generated from defaults). */
export const TriangleShapeFactory = createFrameShapeFactory(
	TRIANGLE_DOC_DEFAULTS,
);
