import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createTextSlotPartDefinition } from "../createTextSlotPartDefinition";
import { createObjectPartRegistry } from "../ObjectPartRegistry";
import { resolveSelectedTextSlotIds } from "../resolveSelectedTextSlotIds";
import { TEXT_SLOT_PART_KIND } from "../textSlotPartKind";

/** A slotted shape keyed like a 2x2 grid (r0c0 … r1c1). */
const grid = (id: string): ObjectState =>
	({
		id,
		type: "table",
		features: { type: "table", geometry: "point", text: "slots" },
		text: {
			r0c0: { text: "a" },
			r0c1: { text: "b" },
			r1c0: { text: "c" },
			r1c1: { text: "d" },
		},
	}) as unknown as ObjectState;

/**
 * The two kinds a table declares beside its cells: a row, standing for the cells
 * of that row (tableTrackParts), and one naming something other than text.
 */
const objectPart = createObjectPartRegistry();
objectPart.register("table", [
	createTextSlotPartDefinition(undefined),
	{
		kind: "row",
		has: () => true,
		textSlotIds: (object, partIds) =>
			Object.keys(
				(object as unknown as { text: Record<string, unknown> }).text,
			).filter((slotId) =>
				partIds.some((rowIndex) => slotId.startsWith(`r${rowIndex}c`)),
			),
	},
	{ kind: "tail", has: () => true },
]);

describe("resolveSelectedTextSlotIds", () => {
	it("names nothing when nothing is picked", () => {
		expect(
			resolveSelectedTextSlotIds(grid("t1"), null, objectPart),
		).toBeUndefined();
	});

	it("names nothing on an object other than the one the parts belong to", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t2"),
				{ objectId: "t1", kind: TEXT_SLOT_PART_KIND, partIds: ["r0c0"] },
				objectPart,
			),
		).toBeUndefined();
	});

	it("hands picked slots back as they are, without asking the type", () => {
		const partIds = ["r0c1", "r1c0"];
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{ objectId: "t1", kind: TEXT_SLOT_PART_KIND, partIds },
				objectPart,
			),
		).toBe(partIds);
	});

	it("asks the kind which slots it covers", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{ objectId: "t1", kind: "row", partIds: ["1"] },
				objectPart,
			),
		).toEqual(["r1c0", "r1c1"]);
	});

	it("names nothing for a kind that covers no slot, or one the type never declared", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{ objectId: "t1", kind: "tail", partIds: ["tip"] },
				objectPart,
			),
		).toBeUndefined();
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{ objectId: "t1", kind: "column", partIds: ["0"] },
				objectPart,
			),
		).toBeUndefined();
	});

	it("names nothing on a type with no parts at all", () => {
		const bare = { id: "b1", type: "rect" } as unknown as ObjectState;
		expect(
			resolveSelectedTextSlotIds(
				bare,
				{ objectId: "b1", kind: "row", partIds: ["0"] },
				objectPart,
			),
		).toBeUndefined();
	});
});
