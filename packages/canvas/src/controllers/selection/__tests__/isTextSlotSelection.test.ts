import { describe, expect, it } from "vitest";

import { isTextSlotSelection, TEXT_SLOT_PART_KIND } from "../textSlotPartKind";
import { vertexPartSelection } from "./support/vertexPartSelection";

describe("isTextSlotSelection", () => {
	it("holds for a pick of the slot kind", () => {
		expect(
			isTextSlotSelection({
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "rows", focusId: "rows" }],
			}),
		).toBe(true);
	});

	it("does not hold while nothing is picked", () => {
		expect(isTextSlotSelection(null)).toBe(false);
	});

	it("does not hold for a pick of another kind", () => {
		expect(isTextSlotSelection(vertexPartSelection(0))).toBe(false);
	});
});
