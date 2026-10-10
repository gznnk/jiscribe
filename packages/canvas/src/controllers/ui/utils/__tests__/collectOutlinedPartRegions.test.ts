import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { createTextSlotPartRegistry } from "../../../selection/__tests__/support/textSlotPartRegistry";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { EMPTY_SELECTION } from "../../../selection/CanvasSelection";
import type { ObjectPartKindDefinition } from "../../../selection/partKinds/ObjectPartKindRegistry";
import { createObjectPartKindRegistry } from "../../../selection/partKinds/ObjectPartKindRegistry";
import { TEXT_SLOT_PART_KIND } from "../../../selection/partKinds/textSlotPartKind";
import { collectOutlinedPartRegions } from "../collectOutlinedPartRegions";

/** Slot order is the key order of `text`: name → attributes → operations. */
const record = {
	id: "rec-1",
	type: "record",
	cx: 0,
	cy: 0,
	width: 120,
	height: 80,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	text: {
		name: { text: "User" },
		attributes: { text: [] },
		operations: { text: [] },
	},
} as unknown as ObjectState;

const objects: Readonly<Record<string, ObjectState>> = { "rec-1": record };

/** With no text-region calculator, every slot's box is the record's whole box. */
const WHOLE_BOX: Rect = { x: -60, y: -40, width: 120, height: 80 };

const selectionOf = (
	kind: string,
	anchorId: string,
	focusId = anchorId,
): CanvasSelection => ({
	objectIds: ["rec-1"],
	part: { kind, ranges: [{ anchorId, focusId }] },
});

const registryWith = (...parts: ObjectPartKindDefinition[]) => {
	const registry = createObjectPartKindRegistry();
	registry.register("record", parts);
	return registry;
};

describe("collectOutlinedPartRegions", () => {
	it("is empty where nothing is selected below the object", () => {
		expect(
			collectOutlinedPartRegions(
				objects,
				createTextSlotPartRegistry("record"),
				EMPTY_SELECTION,
			),
		).toEqual([]);
	});

	it("is empty when the selection names an object that is gone", () => {
		expect(
			collectOutlinedPartRegions(
				{},
				createTextSlotPartRegistry("record"),
				selectionOf(TEXT_SLOT_PART_KIND, "name"),
			),
		).toEqual([]);
	});

	// A part the shape is grabbed by rather than an area of it — a callout's tail tip.
	it("is empty for a kind that declares no region", () => {
		const pointLike: ObjectPartKindDefinition = {
			kind: "tail",
			has: () => true,
		};
		expect(
			collectOutlinedPartRegions(
				objects,
				registryWith(pointLike),
				selectionOf("tail", "tip"),
			),
		).toEqual([]);
	});

	it("is empty for a kind the owner's type never declared", () => {
		expect(
			collectOutlinedPartRegions(
				objects,
				createTextSlotPartRegistry("record"),
				selectionOf("tail", "tip"),
			),
		).toEqual([]);
	});

	it("drops a part whose region answers null and keeps the rest", () => {
		const partial: ObjectPartKindDefinition = {
			kind: "cell",
			has: () => true,
			list: () => ["a", "b", "c"],
			region: (_object, partId) => (partId === "b" ? null : WHOLE_BOX),
		};
		expect(
			collectOutlinedPartRegions(
				objects,
				registryWith(partial),
				selectionOf("cell", "a", "c"),
			),
		).toEqual([
			{ partId: "a", region: WHOLE_BOX },
			{ partId: "c", region: WHOLE_BOX },
		]);
	});

	it("outlines every slot a Shift range runs over, in list order", () => {
		expect(
			collectOutlinedPartRegions(
				objects,
				createTextSlotPartRegistry("record"),
				selectionOf(TEXT_SLOT_PART_KIND, "operations", "name"),
			),
		).toEqual([
			{ partId: "name", region: WHOLE_BOX },
			{ partId: "attributes", region: WHOLE_BOX },
			{ partId: "operations", region: WHOLE_BOX },
		]);
	});
});
