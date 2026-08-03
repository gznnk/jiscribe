import { BRACKET_WITH_STEM_DOC_DEFAULTS } from "./BracketWithStemDoc";
import { createGroupMarkerObjectFactory } from "../shared/createGroupMarkerObjectFactory";

/** Factory for creating BracketWithStem shapes (group-marker shared logic: Frame family, plus the drawn direction). */
export const BracketWithStemObjectFactory = createGroupMarkerObjectFactory(
	BRACKET_WITH_STEM_DOC_DEFAULTS,
);
