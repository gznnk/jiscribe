import type { Dimensions, Rect } from "@jiscribe/geometry";
import { describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { TEXT_STYLE_INTENT_KINDS } from "../../../style/StyleIntent";
import { vertexPartSelection } from "../../__tests__/support/vertexPartSelection";
import {
	createTextSlotPartKindDefinition,
	isTextSlotPart,
	placeTextSlotRegions,
	TEXT_SLOT_PART_KIND,
} from "../textSlotPartKind";

describe("isTextSlotPart", () => {
	it("holds for a pick of the slot kind", () => {
		expect(
			isTextSlotPart({
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "rows", focusId: "rows" }],
			}),
		).toBe(true);
	});

	it("does not hold while nothing is picked", () => {
		expect(isTextSlotPart(null)).toBe(false);
	});

	it("does not hold for a pick of another kind", () => {
		expect(isTextSlotPart(vertexPartSelection(0))).toBe(false);
	});
});

/**
 * A record-like shape placed at the origin, 200x100, with two slots, its body
 * optionally placed on the whole height.
 */
const slotShape = (textVerticalBasis?: "frame"): ObjectState & Dimensions =>
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
		...(textVerticalBasis === undefined ? {} : { textVerticalBasis }),
	}) as unknown as ObjectState & Dimensions;

/** A calculator standing in for a type that stacks its slots down the box. */
const stackedRegions = (state: Dimensions): Readonly<Record<string, Rect>> => ({
	name: { x: -100, y: -state.height / 2, width: 200, height: state.height / 2 },
	rows: { x: -100, y: 0, width: 200, height: state.height / 2 },
});

/** The same layout asked one slot at a time. */
const stackedRegion = (state: Dimensions, slotId: string): Rect =>
	stackedRegions(state)[slotId];

const NAME_REGION: Rect = { x: -100, y: -50, width: 200, height: 50 };
const ROWS_REGION: Rect = { x: -100, y: 0, width: 200, height: 50 };
const FULL_BOX: Rect = { x: -100, y: -50, width: 200, height: 100 };

describe("createTextSlotPartKindDefinition", () => {
	const part = createTextSlotPartKindDefinition();

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

	it("places nothing of its own when given no calculators", () => {
		expect(part.region).toBeUndefined();
		expect(part.regions).toBeUndefined();
	});

	it("carries the calculators as given, before any basis", () => {
		expect(
			createTextSlotPartKindDefinition({ region: stackedRegion }).region,
		).toBe(stackedRegion);
		expect(
			createTextSlotPartKindDefinition({ regions: stackedRegions }).regions,
		).toBe(stackedRegions);
	});

	it("refuses region and regions together", () => {
		expect(() =>
			createTextSlotPartKindDefinition({
				region: stackedRegion,
				regions: stackedRegions,
			}),
		).toThrow('The "textSlot" part kind takes region or regions, not both');
	});
});

describe("placeTextSlotRegions: region", () => {
	it("takes each region from the kind's own one-slot calculator", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ region: stackedRegion }),
		);
		expect(placed.region?.(slotShape(), "name")).toEqual(NAME_REGION);
		expect(placed.region?.(slotShape(), "rows")).toEqual(ROWS_REGION);
	});

	it("picks the slot's region out of the kind's batch answer", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ regions: stackedRegions }),
		);
		expect(placed.region?.(slotShape(), "rows")).toEqual(ROWS_REGION);
	});

	it("gives the whole box to every slot of a kind placing none", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition(),
		);
		expect(placed.region?.(slotShape(), "rows")).toEqual(FULL_BOX);
	});

	it("puts the region on the whole height for the frame basis, keeping its width", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ regions: stackedRegions }),
		);
		expect(placed.region?.(slotShape("frame"), "rows")).toEqual({
			x: -100,
			y: -50,
			width: 200,
			height: 100,
		});
	});

	it("throws for a held slot the batch answers no region for, naming the type and the slot", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({
				regions: (state: Dimensions) => ({
					name: stackedRegions(state).name,
				}),
			}),
		);
		expect(() => placed.region?.(slotShape(), "rows")).toThrow(
			'The "textSlot" part kind of type "record" answers no region for text slot "rows" (it answers name)',
		);
	});

	it("has no region for a slot the object lost, nor for an untransformed object", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ regions: stackedRegions }),
		);
		expect(placed.region?.(slotShape(), "operations")).toBeNull();
		// A prototype member is not a slot, however the lookup is spelled.
		expect(placed.region?.(slotShape(), "toString")).toBeNull();
		const unplaced = {
			id: "rec-1",
			type: "record",
			width: 200,
			height: 100,
			text: { name: { text: "User" } },
		} as unknown as ObjectState & Dimensions;
		expect(placed.region?.(unplaced, "name")).toBeNull();
	});

	it("keeps everything else the kind declares", () => {
		const declared = createTextSlotPartKindDefinition();
		const placed = placeTextSlotRegions("record", declared);
		expect(placed.kind).toBe(TEXT_SLOT_PART_KIND);
		expect(placed.styleIntentKinds).toBe(declared.styleIntentKinds);
		expect(placed.list?.(slotShape())).toEqual(["name", "rows"]);
	});
});

describe("placeTextSlotRegions: regions", () => {
	it("asks the kind's batch calculator exactly once for every slot", () => {
		const regions = vi.fn(stackedRegions);
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ regions }),
		);

		expect(placed.regions?.(slotShape())).toEqual({
			name: NAME_REGION,
			rows: ROWS_REGION,
		});
		expect(regions).toHaveBeenCalledTimes(1);
	});

	it("answers the slots of the object alone, in its key order", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({
				regions: (state: Dimensions) => ({
					operations: FULL_BOX,
					...stackedRegions(state),
				}),
			}),
		);
		expect(Object.keys(placed.regions?.(slotShape()) ?? {})).toEqual([
			"name",
			"rows",
		]);
	});

	it("throws when the batch leaves a slot of the object out", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({
				regions: (state: Dimensions) => ({
					name: stackedRegions(state).name,
				}),
			}),
		);
		expect(() => placed.regions?.(slotShape())).toThrow(
			'The "textSlot" part kind of type "record" answers no region for text slot "rows"',
		);
	});

	it("asks a one-slot calculator once per slot", () => {
		const region = vi.fn(stackedRegion);
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ region }),
		);

		expect(placed.regions?.(slotShape())).toEqual({
			name: NAME_REGION,
			rows: ROWS_REGION,
		});
		expect(region).toHaveBeenCalledTimes(2);
	});

	it("gives every slot the whole box for a kind placing none", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition(),
		);
		expect(placed.regions?.(slotShape())).toEqual({
			name: FULL_BOX,
			rows: FULL_BOX,
		});
	});

	it("applies the vertical basis to every region", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ regions: stackedRegions }),
		);
		expect(placed.regions?.(slotShape("frame"))).toEqual({
			name: FULL_BOX,
			rows: FULL_BOX,
		});
	});

	it("answers nothing for an untransformed object", () => {
		const placed = placeTextSlotRegions(
			"record",
			createTextSlotPartKindDefinition({ regions: stackedRegions }),
		);
		const unplaced = {
			id: "rec-1",
			type: "record",
			width: 200,
			height: 100,
			text: { name: { text: "User" } },
		} as unknown as ObjectState & Dimensions;
		expect(placed.regions?.(unplaced)).toEqual({});
	});
});

describe("createTextSlotPartKindDefinition: what a pick receives", () => {
	const part = createTextSlotPartKindDefinition();

	it("receives the text kinds and nothing else", () => {
		expect(part.styleIntentKinds).toBe(TEXT_STYLE_INTENT_KINDS);
	});

	it("reaches the very slots the pick covers, in their order", () => {
		const anyObject = {} as ObjectState;
		expect(part.textSlotIds?.(anyObject, ["rows", "name"])).toEqual([
			"rows",
			"name",
		]);
	});
});

describe("placeTextSlotRegions: a declared region answering null", () => {
	it("throws naming the type and the slot rather than standing in a box", () => {
		const placed = placeTextSlotRegions("record", {
			...createTextSlotPartKindDefinition(),
			region: () => null,
		});
		expect(() => placed.region?.(slotShape(), "name")).toThrow(
			'The "textSlot" part kind of type "record" answers no region for text slot "name" it holds',
		);
	});
});
