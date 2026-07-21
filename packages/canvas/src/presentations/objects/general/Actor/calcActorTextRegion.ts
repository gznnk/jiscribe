import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { ACTOR_FIGURE_RATIO } from "../../../../schemas/objects/general/actor/ActorDoc";
import type { ObjectTextRegionCalculator } from "../../registry/ObjectTextRegionRegistry";

/** Restricts the region to the caption band below the stick figure. */
export const calcActorTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect({ cx: 0, cy: 0, width, height }, { top: ACTOR_FIGURE_RATIO });
