import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	TEXT_SLOT_PART_KIND,
} from "@jiscribe/canvas-sdk";
import { calcOutsideBoxTextRegion } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { azureIconDefinition } from "../definition";
import { azureIconDocDefinition } from "../doc";

// A below-label works only with all three pieces in place (canvas-sdk's
// index.ts): the text slot's region, the visualBounds, and BelowLabelHitArea in
// the drawing (createIconSetObject). This pins the first two.
describe("azureIcon's below-label", () => {
	it("registers the same region calculators awsIcon does", () => {
		const textSlotKind = azureIconDefinition.partKinds?.find(
			(part) => part.kind === TEXT_SLOT_PART_KIND,
		);
		expect(textSlotKind?.region).toBe(calcBelowLabelTextRegion);
		expect(azureIconDefinition.visualBounds).toBe(calcBelowLabelVisualBounds);
	});

	it('answers "outside the box" on the doc side, so the parser sizes no height', () => {
		expect(azureIconDocDefinition.textRegion).toBe(calcOutsideBoxTextRegion);
		expect(azureIconDefinition.textRegion).toBe(calcOutsideBoxTextRegion);
	});
});
