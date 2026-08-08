import { buildBracePath } from "./buildBracePath";
import { createGroupMarkerObject } from "../shared/createGroupMarkerObject";

/** Renders a brace (group-marker shared logic lives in createGroupMarkerObject). */
export const Brace = createGroupMarkerObject(buildBracePath);
