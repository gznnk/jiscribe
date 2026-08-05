import { buildBracketWithStemPath } from "./buildBracketWithStemPath";
import { createGroupMarkerObject } from "../shared/createGroupMarkerObject";

/** Renders a square bracket with a stem (group-marker shared logic lives in createGroupMarkerObject). */
export const BracketWithStem = createGroupMarkerObject(
	buildBracketWithStemPath,
);
