import { STORED_DATA_DOC_DEFAULTS } from "./StoredDataDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating StoredData shapes (Frame-family shared logic generated from defaults). */
export const StoredDataObjectFactory = createFrameObjectFactory(
	STORED_DATA_DOC_DEFAULTS,
);
