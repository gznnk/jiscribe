import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { ACTOR_FIGURE_RATIO } from "../../../../schemas/objects/general/actor/ActorDoc";

/** Restricts the region to the caption band below the stick figure. */
export const calcActorTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect({ cx: 0, cy: 0, width, height }, { top: ACTOR_FIGURE_RATIO });
