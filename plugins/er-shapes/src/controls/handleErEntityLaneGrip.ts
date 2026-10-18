import { createErEntityGripHandler } from "./createErEntityGripHandler";
import {
	ER_ENTITY_LANES,
	parseErEntityLanePartId,
} from "../parts/erEntityLaneIds";
import { ER_ENTITY_LANE_PART_KIND } from "../parts/erEntityLanePartKind";
import { countErEntityColumns } from "../schema/erEntityColumnIds";

/**
 * A lane grip's click: picks the whole lane as an `"erEntityLane"` part, or with
 * Shift or Ctrl / Meta extends or toggles a lane pick
 * (createErEntityGripHandler). An entity of no columns has no lanes to pick.
 */
export const handleErEntityLaneGrip = createErEntityGripHandler({
	kind: ER_ENTITY_LANE_PART_KIND,
	toPartId: (index) => ER_ENTITY_LANES[index],
	parseIndex: (partId) => {
		const lane = parseErEntityLanePartId(partId);
		return lane === null ? null : ER_ENTITY_LANES.indexOf(lane);
	},
	count: (object) =>
		countErEntityColumns(object.text) > 0 ? ER_ENTITY_LANES.length : 0,
});
