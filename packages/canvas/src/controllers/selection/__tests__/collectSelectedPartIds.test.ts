import { describe, expect, it } from "vitest";

import { collectSelectedPartIds } from "../collectSelectedPartIds";
import { TEXT_SLOT_PART_KIND } from "../textSlotPartKind";

const partOf = (
	ranges: { anchorId: string; focusId: string }[],
): Parameters<typeof collectSelectedPartIds>[0] => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges,
});

describe("collectSelectedPartIds", () => {
	it("gives the one id a collapsed range names", () => {
		expect(
			collectSelectedPartIds(partOf([{ anchorId: "name", focusId: "name" }])),
		).toEqual(["name"]);
	});

	it("collapses a range whose ends differ to its focus", () => {
		expect(
			collectSelectedPartIds(partOf([{ anchorId: "name", focusId: "rows" }])),
		).toEqual(["rows"]);
	});

	it("keeps the ranges in their stored order", () => {
		expect(
			collectSelectedPartIds(
				partOf([
					{ anchorId: "rows", focusId: "rows" },
					{ anchorId: "name", focusId: "name" },
				]),
			),
		).toEqual(["rows", "name"]);
	});

	it("gives a repeated id once", () => {
		expect(
			collectSelectedPartIds(
				partOf([
					{ anchorId: "name", focusId: "name" },
					{ anchorId: "rows", focusId: "name" },
				]),
			),
		).toEqual(["name"]);
	});
});
