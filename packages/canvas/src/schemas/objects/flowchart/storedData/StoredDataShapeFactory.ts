import { STORED_DATA_DOC_DEFAULTS } from "./StoredDataDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating StoredData shapes (Frame-family shared logic generated from defaults). */
export const StoredDataShapeFactory = createFrameShapeFactory(
	STORED_DATA_DOC_DEFAULTS,
);
