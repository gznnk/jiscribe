import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createTextSlotPartKindDefinition } from "../createTextSlotPartKindDefinition";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";
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
const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("table", [
	createTextSlotPartKindDefinition(undefined),
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
			resolveSelectedTextSlotIds(grid("t1"), null, objectPartKind),
		).toBeUndefined();
	});

	it("names nothing on an object other than the one the parts belong to", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t2"),
				{
					objectId: "t1",
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "r0c0", focusId: "r0c0" }],
				},
				objectPartKind,
			),
		).toBeUndefined();
	});

	it("hands picked slots back as they are, the slot kind declaring the identity", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{
					objectId: "t1",
					kind: TEXT_SLOT_PART_KIND,
					ranges: [
						{ anchorId: "r0c1", focusId: "r0c1" },
						{ anchorId: "r1c0", focusId: "r1c0" },
					],
				},
				objectPartKind,
			),
		).toEqual(["r0c1", "r1c0"]);
	});

	it("covers every slot a range spans, in the type's own order", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{
					objectId: "t1",
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "r1c0", focusId: "r0c1" }],
				},
				objectPartKind,
			),
		).toEqual(["r0c1", "r1c0"]);
	});

	it("asks the kind which slots it covers", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{
					objectId: "t1",
					kind: "row",
					ranges: [{ anchorId: "1", focusId: "1" }],
				},
				objectPartKind,
			),
		).toEqual(["r1c0", "r1c1"]);
	});

	it("names nothing for a kind that covers no slot, or one the type never declared", () => {
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{
					objectId: "t1",
					kind: "tail",
					ranges: [{ anchorId: "tip", focusId: "tip" }],
				},
				objectPartKind,
			),
		).toBeUndefined();
		expect(
			resolveSelectedTextSlotIds(
				grid("t1"),
				{
					objectId: "t1",
					kind: "column",
					ranges: [{ anchorId: "0", focusId: "0" }],
				},
				objectPartKind,
			),
		).toBeUndefined();
	});

	it("names nothing on a type with no parts at all", () => {
		const bare = { id: "b1", type: "rect" } as unknown as ObjectState;
		expect(
			resolveSelectedTextSlotIds(
				bare,
				{
					objectId: "b1",
					kind: "row",
					ranges: [{ anchorId: "0", focusId: "0" }],
				},
				objectPartKind,
			),
		).toBeUndefined();
	});
});
