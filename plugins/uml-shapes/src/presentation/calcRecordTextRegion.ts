import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { Rect } from "@jiscribe/geometry";

import { calcRecordTextSlotRegions } from "./calcRecordTextSlotRegions";
import type { RecordTextSlotRegionsState } from "./calcRecordTextSlotRegions";

/**
 * Places one text slot of a record. Registered per type, so display (TextOverlay)
 * and editing (TextEditor) resolve the same rectangle.
 *
 * A slot id with no region — a compartment this box does not have — is an
 * invariant broken upstream (the slot is resolved against `state.text`, the same
 * key set the regions come from), so it throws rather than answering with another
 * band, which would draw the text somewhere plausible and hide the breakage.
 */
export const calcRecordTextRegion: ObjectTextRegionCalculator<
	RecordTextSlotRegionsState
> = (state, slotId) => {
	const regions = calcRecordTextSlotRegions(state);
	const bySlotId: Record<string, Rect | undefined> = regions;
	const region = bySlotId[slotId];
	if (region === undefined) {
		throw new Error(
			`calcRecordTextRegion: no "${slotId}" compartment on this record (it has ${Object.keys(regions).join(", ")})`,
		);
	}
	return region;
};
