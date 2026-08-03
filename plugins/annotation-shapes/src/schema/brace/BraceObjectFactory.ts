import { BRACE_DOC_DEFAULTS } from "./BraceDoc";
import { createGroupMarkerObjectFactory } from "../shared/createGroupMarkerObjectFactory";

/** Factory for creating Brace shapes (group-marker shared logic: Frame family, plus the drawn direction). */
export const BraceObjectFactory =
	createGroupMarkerObjectFactory(BRACE_DOC_DEFAULTS);
