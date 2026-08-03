import { BRACKET_DOC_DEFAULTS } from "./BracketDoc";
import { createGroupMarkerObjectFactory } from "../shared/createGroupMarkerObjectFactory";

/** Factory for creating Bracket shapes (group-marker shared logic: Frame family, plus the drawn direction). */
export const BracketObjectFactory =
	createGroupMarkerObjectFactory(BRACKET_DOC_DEFAULTS);
