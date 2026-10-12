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
import { resolveTextSlotIds } from "../resolveTextSlotIds";

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
 * no `textSlotIds`.
 */
const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("rect", [
	createTextSlotPartKindDefinition(undefined),
	{
		kind: "band",
		has: () => true,
		list: () => ["0", "1"],
		textSlotIds: (_object, partIds) => [
			...partIds.map((partId) => (partId === "0" ? "operations" : "name")),
			"missing",
		],
	},
	{ kind: "handle", has: () => true },
]);
const ctx = contextOf({ objectPartKind });

describe("resolveTextSlotIds", () => {
	it("reaches every slot with nothing picked", () => {
		expect(resolveTextSlotIds(keyedRect(), null, ctx)).toEqual([
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
		expect(resolveTextSlotIds(keyedRect(), pick, ctx)).toEqual([
			"name",
			"attributes",
		]);
	});

	it("asks a kind declaring textSlotIds, handing it the expanded ids and dropping a slot the object lacks", () => {
		const pick = { kind: "band", ranges: [{ anchorId: "0", focusId: "1" }] };
		expect(resolveTextSlotIds(keyedRect(), pick, ctx)).toEqual([
			"operations",
			"name",
		]);
	});

	it("reaches every slot under a pick of a kind declaring no textSlotIds", () => {
		const pick = { kind: "handle", ranges: [{ anchorId: "0", focusId: "0" }] };
		expect(resolveTextSlotIds(keyedRect(), pick, ctx)).toEqual([
			"name",
			"attributes",
			"operations",
		]);
	});

	it("yields nothing for an object holding no text", () => {
		expect(resolveTextSlotIds(rectOf("a"), null, ctx)).toEqual([]);
	});

	it("throws on a pick of a kind the type does not register", () => {
		const pick = { kind: "cell", ranges: [{ anchorId: "0", focusId: "0" }] };
		expect(() => resolveTextSlotIds(keyedRect(), pick, ctx)).toThrow(/"cell"/);
	});

	it("resolves a rect's body pick through the textSlot kind applyObjectDefinition registers", () => {
		const { objectPartKind: applied } = createTestRegistries();
		const rect = rectOf("a", { text: { body: { text: "hi" } } });
		expect(
			resolveTextSlotIds(
				rect,
				slotPickOf("body"),
				contextOf({ objectPartKind: applied }),
			),
		).toEqual(["body"]);
	});
});
