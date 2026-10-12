import { describe, expect, it } from "vitest";

import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { createObjectPartKindRegistry } from "../../../../selection/partKinds/ObjectPartKindRegistry";
import {
	createTextSlotPartKindDefinition,
	TEXT_SLOT_PART_KIND,
} from "../../../../selection/partKinds/textSlotPartKind";
import {
	contextOf,
	rectOf,
	slotPickOf,
	textRectOf,
} from "../../../__tests__/support/styleFixtures";
import { resolveSlotIds } from "../resolveSlotIds";

/** A three-slot shape, standing in for a record. */
const keyedRect = () =>
	textRectOf("a", {
		name: { text: "User" },
		attributes: { text: ["id"] },
		operations: { text: [] },
	});

/**
 * The rect's slots, plus two kinds of its own: `band` reaches the slot named
 * after each picked part (and one the object does not hold), `handle` declares
 * no `slotIds`.
 */
const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("rect", [
	createTextSlotPartKindDefinition(undefined),
	{
		kind: "band",
		has: () => true,
		list: () => ["0", "1"],
		slotIds: (_object, partIds) => [
			...partIds.map((partId) => (partId === "0" ? "operations" : "name")),
			"missing",
		],
	},
	{ kind: "handle", has: () => true },
]);
const ctx = contextOf({ objectPartKind });

describe("resolveSlotIds", () => {
	it("reaches every slot with nothing picked", () => {
		expect(resolveSlotIds(keyedRect(), null, ctx)).toEqual([
			"name",
			"attributes",
			"operations",
		]);
	});

	it("reaches the slots a textSlot range covers, the range expanded", () => {
		const pick = {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "name", focusId: "attributes" }],
		};
		expect(resolveSlotIds(keyedRect(), pick, ctx)).toEqual([
			"name",
			"attributes",
		]);
	});

	it("asks a kind declaring slotIds, handing it the expanded ids and dropping a slot the object lacks", () => {
		const pick = { kind: "band", ranges: [{ anchorId: "0", focusId: "1" }] };
		expect(resolveSlotIds(keyedRect(), pick, ctx)).toEqual([
			"operations",
			"name",
		]);
	});

	it("reaches every slot under a pick of a kind declaring no slotIds", () => {
		const pick = { kind: "handle", ranges: [{ anchorId: "0", focusId: "0" }] };
		expect(resolveSlotIds(keyedRect(), pick, ctx)).toEqual([
			"name",
			"attributes",
			"operations",
		]);
	});

	it("yields nothing for an object holding no text", () => {
		expect(resolveSlotIds(rectOf("a"), null, ctx)).toEqual([]);
	});

	it("throws on a pick of a kind the type does not register", () => {
		const pick = { kind: "cell", ranges: [{ anchorId: "0", focusId: "0" }] };
		expect(() => resolveSlotIds(keyedRect(), pick, ctx)).toThrow(/"cell"/);
	});

	it("resolves a rect's body pick through the textSlot kind applyObjectDefinition registers", () => {
		const { objectPartKind: applied } = createTestRegistries();
		const rect = rectOf("a", { text: { body: { text: "hi" } } });
		expect(
			resolveSlotIds(
				rect,
				slotPickOf("body"),
				contextOf({ objectPartKind: applied }),
			),
		).toEqual(["body"]);
	});
});
