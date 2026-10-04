import { describe, expect, it } from "vitest";

import {
	isTextSlotSelection,
	readTextSlotPart,
	TEXT_SLOT_PART_KIND,
	textSlotPart,
} from "../textSlotPartKind";
import { vertexPartSelection } from "./support/vertexPartSelection";

describe("isTextSlotSelection", () => {
	it("holds for a pick of the slot kind", () => {
		expect(
			isTextSlotSelection({
				objectId: "rec-1",
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "rows", focusId: "rows" }],
			}),
		).toBe(true);
	});

	it("does not hold while nothing is picked", () => {
		expect(isTextSlotSelection(null)).toBe(false);
	});

	it("does not hold for a pick of another kind", () => {
		expect(isTextSlotSelection(vertexPartSelection("p1", 0))).toBe(false);
	});
});

describe("readTextSlotPart", () => {
	it("reads the slot id off a text slot's address", () => {
		expect(readTextSlotPart(textSlotPart("rows"))).toBe("rows");
	});

	it("names no slot for a press on the body", () => {
		expect(readTextSlotPart(undefined)).toBeUndefined();
	});

	it("names no slot for an address of another kind", () => {
		expect(readTextSlotPart("vertex:0")).toBeUndefined();
	});

	it("names no slot for a bare slot id, the way the plugins spelled it before the address", () => {
		expect(readTextSlotPart("rows")).toBeUndefined();
	});
});
