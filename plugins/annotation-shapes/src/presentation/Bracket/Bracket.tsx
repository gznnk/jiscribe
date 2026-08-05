import { buildBracketPath } from "./buildBracketPath";
import { createGroupMarkerObject } from "../shared/createGroupMarkerObject";

/** Renders a square bracket (group-marker shared logic lives in createGroupMarkerObject). */
export const Bracket = createGroupMarkerObject(buildBracketPath);
