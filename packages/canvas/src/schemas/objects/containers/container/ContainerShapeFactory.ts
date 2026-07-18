import { CONTAINER_DOC_DEFAULTS } from "./ContainerDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Container shapes (Frame-family shared logic generated from defaults). */
export const ContainerShapeFactory = createFrameShapeFactory(
	CONTAINER_DOC_DEFAULTS,
);
