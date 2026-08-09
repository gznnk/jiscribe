import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Rect } from "@jiscribe/geometry";

import { calcRecordSlotRegions } from "./calcRecordSlotRegions";
import type { RecordSlotRegionsState } from "./calcRecordSlotRegions";

/**
 * Places one text slot of a record. Registered per type, so display (TextOverlay)
 * and editing (TextEditor) resolve the same rectangle. A slot id with no region —
 * a compartment this box does not have — cannot reach here in practice (the slot
 * is resolved against `state.text`, the same key set the regions come from), so
 * it falls back to the title band rather than inventing a region.
 */
export const calcRecordTextRegion: ObjectTextRegionCalculator<
	RecordSlotRegionsState
> = (state, slotId) => {
	const regions = calcRecordSlotRegions(state);
	const bySlotId: Record<string, Rect | undefined> = regions;
	return bySlotId[slotId] ?? regions.name;
};
