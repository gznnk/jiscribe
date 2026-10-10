import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { vertexPartSelection } from "../../__tests__/support/vertexPartSelection";
import {
	createTextSlotPartKindDefinition,
	isTextSlotSelection,
	TEXT_SLOT_PART_KIND,
} from "../textSlotPartKind";

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

/** A record-like shape placed at the origin, 200x100, with two slots. */
const slotShape = (): ObjectState =>
	({
		id: "rec-1",
		type: "record",
		features: { text: "slots" },
		cx: 0,
		cy: 0,
		width: 200,
		height: 100,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		text: { name: { text: "User" }, rows: { text: ["id: string"] } },
	}) as unknown as ObjectState;

/** A calculator standing in for a type that stacks its slots down the box. */
const stackedRegion = (state: { height: number }, slotId: string): Rect => ({
	x: -100,
	y: slotId === "name" ? -state.height / 2 : 0,
	width: 200,
	height: state.height / 2,
});

describe("createTextSlotPartKindDefinition", () => {
	const part = createTextSlotPartKindDefinition(stackedRegion);

	it("declares the text-slot namespace", () => {
		expect(part.kind).toBe(TEXT_SLOT_PART_KIND);
	});

	it("has only the slots the object currently holds", () => {
		const object = slotShape();
		expect(part.has(object, "name")).toBe(true);
		expect(part.has(object, "operations")).toBe(false);
		// A prototype member is not a slot, however the lookup is spelled.
		expect(part.has(object, "toString")).toBe(false);
	});

	it("has nothing on an object carrying no keyed text", () => {
		const textless = { id: "r1", type: "rect" } as unknown as ObjectState;
		expect(part.has(textless, "body")).toBe(false);
		expect(part.list?.(textless)).toEqual([]);
	});

	it("lists the slots in the object's own key order", () => {
		expect(part.list?.(slotShape())).toEqual(["name", "rows"]);
	});

	it("takes each region from the type's own calculator", () => {
		expect(part.region?.(slotShape(), "name")).toEqual({
			x: -100,
			y: -50,
			width: 200,
			height: 50,
		});
		expect(part.region?.(slotShape(), "rows")).toEqual({
			x: -100,
			y: 0,
			width: 200,
			height: 50,
		});
	});

	it("gives the whole box to every slot of a type that registers no calculator", () => {
		const plain = createTextSlotPartKindDefinition(undefined);
		expect(plain.region?.(slotShape(), "rows")).toEqual({
			x: -100,
			y: -50,
			width: 200,
			height: 100,
		});
	});

	it("has no region for a slot the object lost, nor for an untransformed object", () => {
		expect(part.region?.(slotShape(), "operations")).toBeNull();
		const unplaced = {
			id: "rec-1",
			type: "record",
			text: { name: { text: "User" } },
		} as unknown as ObjectState;
		expect(part.region?.(unplaced, "name")).toBeNull();
	});
});
