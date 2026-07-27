import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { calcRecordSlotRegions } from "./calcRecordSlotRegions";
import { RECORD_ROWS_SLOT_ID } from "../schema/RecordDoc";

/**
 * Places one text slot of a record. Registered per type, so display (TextOverlay)
 * and editing (TextEditor) resolve the same rectangle. An unrecognized slot id
 * cannot reach here in practice (the slot is resolved against `state.text`), so
 * it falls back to the title band rather than inventing a region.
 */
export const calcRecordTextRegion: ObjectTextRegionCalculator<Dimensions> = (
	state,
	slotId,
) => {
	const regions = calcRecordSlotRegions(state);
	return slotId === RECORD_ROWS_SLOT_ID ? regions.rows : regions.name;
};
