import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { Dimensions, Rect } from "@jiscribe/geometry";
import { describe, expect, it, vi } from "vitest";

import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import {
	createTextSlotPartKindDefinition,
	TEXT_SLOT_PART_KIND,
} from "../../selection/partKinds/textSlotPartKind";
import { applyObjectDefinition } from "../applyObjectDefinition";
import { createTestRegistries } from "../createCanvasRegistries";

// Minimal stand-in for an object type, mirroring buildFakeDefinition in
// createCanvasRegistries.test.ts, with the text form under test.
const buildFakeDefinition = (
	type: string,
	text: ObjectFeatures["text"],
): ObjectTypeDefinition =>
	defineObject({
		features: { type, geometry: "rect", text },
		validateDoc: () => [],
		mapper: {
			toDoc: (state) => ({ id: state.id, type }),
			toState: (doc) => ({ id: doc.id, type }),
		},
		stateValidator: () => true,
		component: () => null,
		behavior: {
			moveByDelta: (state) => state,
			transformByGroup: (state) => state,
			rotateByGroup: (state) => state,
		},
		menu: [],
	});

const halfBox = ({ width, height }: Dimensions): Rect => ({
	x: -width / 2,
	y: -height / 2,
	width,
	height: height / 2,
});

const stackedRegions = (state: Dimensions): Readonly<Record<string, Rect>> => ({
	header: halfBox(state),
});

/** A "card" placed at the origin, 200x100, holding the one `header` slot. */
const cardObject = (textVerticalBasis?: "frame"): ObjectState =>
	({
		id: "card-1",
		type: "card",
		cx: 0,
		cy: 0,
		width: 200,
		height: 100,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		text: { header: { text: "Title" } },
		...(textVerticalBasis === undefined ? {} : { textVerticalBasis }),
	}) as unknown as ObjectState;

const readTextSlotKind = (
	registries: ReturnType<typeof createTestRegistries>,
	type: string,
) => registries.objectPartKind.get(type, TEXT_SLOT_PART_KIND);

describe("applyObjectDefinition: the text slot kind's place", () => {
	it("gives a type declaring no kind the whole box", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(
			registries,
			"card",
			buildFakeDefinition("card", "slots"),
		);

		const textSlotKind = readTextSlotKind(registries, "card");
		expect(textSlotKind?.region?.(cardObject(), "header")).toEqual({
			x: -100,
			y: -50,
			width: 200,
			height: 100,
		});
		expect(textSlotKind?.regions?.(cardObject())).toEqual({
			header: { x: -100, y: -50, width: 200, height: 100 },
		});
	});

	it("places a declared kind's slots with its own calculators, the basis on top", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "card", {
			...buildFakeDefinition("card", "slots"),
			partKinds: [
				{
					...createTextSlotPartKindDefinition({ regions: stackedRegions }),
					delete: () => null,
				},
			],
		});

		const textSlotKind = readTextSlotKind(registries, "card");
		expect(textSlotKind?.delete).toBeDefined();
		expect(textSlotKind?.region?.(cardObject(), "header")).toEqual(
			halfBox({ width: 200, height: 100 }),
		);
		expect(textSlotKind?.region?.(cardObject("frame"), "header")).toEqual({
			x: -100,
			y: -50,
			width: 200,
			height: 100,
		});
	});

	it("asks a declared batch calculator once per regions call", () => {
		const regions = vi.fn(stackedRegions);
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "card", {
			...buildFakeDefinition("card", "slots"),
			partKinds: [createTextSlotPartKindDefinition({ regions })],
		});

		readTextSlotKind(registries, "card")?.regions?.(cardObject());
		expect(regions).toHaveBeenCalledTimes(1);
	});

	it("throws, naming the type and the slot, when the batch leaves a held slot out", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "card", {
			...buildFakeDefinition("card", "slots"),
			partKinds: [createTextSlotPartKindDefinition({ regions: () => ({}) })],
		});

		expect(() =>
			readTextSlotKind(registries, "card")?.regions?.(cardObject()),
		).toThrow(
			'The "textSlot" part kind of type "card" answers no region for text slot "header" (it answers none)',
		);
	});

	it("places the built-in ellipse's body in its inscribed rect", () => {
		const registries = createTestRegistries();
		const ellipse = {
			...cardObject(),
			type: "ellipse",
			text: { body: { text: "x" } },
		} as unknown as ObjectState;

		const region = readTextSlotKind(registries, "ellipse")?.region?.(
			ellipse,
			"body",
		);
		expect(region?.width).toBeCloseTo(200 / Math.SQRT2);
		expect(region?.height).toBeCloseTo(100 / Math.SQRT2);
	});

	it("gives the built-in rect its whole box", () => {
		const registries = createTestRegistries();
		const rect = {
			...cardObject(),
			type: "rect",
			text: { body: { text: "x" } },
		} as unknown as ObjectState;

		expect(
			readTextSlotKind(registries, "rect")?.region?.(rect, "body"),
		).toEqual({ x: -100, y: -50, width: 200, height: 100 });
	});
});
