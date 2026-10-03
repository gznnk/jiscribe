import { describe, expect, it } from "vitest";

import { createTextSlotPartRegistry } from "./support/textSlotPartRegistry";
import { vertexPartSelection } from "./support/vertexPartSelection";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createVertexPartKindDefinition } from "../createVertexPartKindDefinition";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";
import type { ObjectPartSelection } from "../ObjectPartSelection";
import { resolveSelectedTextSlotIds } from "../resolveSelectedTextSlotIds";
import { TEXT_SLOT_PART_KIND } from "../textSlotPartKind";

/** A record-like shape: multiple text slots, declared via features.text = "slots". */
const slotShape = (id: string): ObjectState =>
	({
		id,
		type: "record",
		features: { text: "slots" },
		text: { name: { text: "User" }, rows: { text: ["id: string"] } },
	}) as unknown as ObjectState;

/** A polyline, whose only parts are vertices — a kind covering no slot. */
const poly = (id: string): ObjectState =>
	({
		id,
		type: "polyline",
		points: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
	}) as unknown as ObjectState;

const slotRegistry = createTextSlotPartRegistry("record");

const vertexRegistry = createObjectPartKindRegistry();
vertexRegistry.register("polyline", [createVertexPartKindDefinition(2)]);

const textSlot = (objectId: string, slotId: string): ObjectPartSelection => ({
	objectId,
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: slotId, focusId: slotId }],
});

describe("resolveSelectedTextSlotIds", () => {
	it("gives the picked slot itself, the kind declaring the identity", () => {
		expect(
			resolveSelectedTextSlotIds(
				slotShape("rec-1"),
				textSlot("rec-1", "rows"),
				slotRegistry,
			),
		).toEqual(["rows"]);
	});

	it("gives the slots a kind standing for a group of them covers", () => {
		const registry = createObjectPartKindRegistry();
		registry.register("record", [
			{
				kind: "row",
				has: () => true,
				// A row stands for every slot of the object, which is enough to show
				// that the ids come from the kind rather than from the pick.
				textSlotIds: (object) =>
					Object.keys(
						(object as unknown as { text: Record<string, unknown> }).text,
					),
			},
		]);
		expect(
			resolveSelectedTextSlotIds(
				slotShape("rec-1"),
				{
					objectId: "rec-1",
					kind: "row",
					ranges: [{ anchorId: "0", focusId: "0" }],
				},
				registry,
			),
		).toEqual(["name", "rows"]);
	});

	it("names nothing while nothing is picked", () => {
		expect(
			resolveSelectedTextSlotIds(slotShape("rec-1"), null, slotRegistry),
		).toBeUndefined();
	});

	it("names nothing when the pick sits on another object", () => {
		expect(
			resolveSelectedTextSlotIds(
				slotShape("rec-2"),
				textSlot("rec-1", "rows"),
				slotRegistry,
			),
		).toBeUndefined();
	});

	it("names nothing when the object's type registers no such kind", () => {
		expect(
			resolveSelectedTextSlotIds(
				slotShape("rec-1"),
				vertexPartSelection("rec-1", 0),
				slotRegistry,
			),
		).toBeUndefined();
	});

	it("names nothing for a kind that declares no slots", () => {
		expect(
			resolveSelectedTextSlotIds(
				poly("p1"),
				vertexPartSelection("p1", 1),
				vertexRegistry,
			),
		).toBeUndefined();
	});
});
