import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { ObjectDocLabelRegionCalculator } from "@jiscribe/doc/plugin/ObjectDocLabelRegion";
import { calcFullBoxTextRegion } from "@jiscribe/doc/plugin/ObjectDocTextRegion";
import {
	calcLabelTextRegion,
	calcLabelTextVisualBounds,
} from "@jiscribe/doc/text/label/calcLabelTextRegion";
import type { Dimensions } from "@jiscribe/geometry";
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

const labelFeatures: ObjectFeatures = {
	type: "captioned",
	geometry: "rect",
	transform: true,
	text: "label",
};

/** A `"label"` type the way a plugin declares one: no placement of its own. */
const buildLabelDefinition = (
	defaults?: Record<string, unknown>,
): ObjectTypeDefinition =>
	defineObject({
		features: labelFeatures,
		validateDoc: () => [],
		mapper: {
			toDoc: (state) => ({ id: state.id, type: "captioned" }),
			toState: (doc) => ({ id: doc.id, type: "captioned" }),
		},
		stateValidator: () => true,
		component: () => null,
		behavior: {
			moveByDelta: (state) => state,
			transformByGroup: (state) => state,
			rotateByGroup: (state) => state,
		},
		menu: [],
		...(defaults === undefined
			? {}
			: { defaults: { type: "captioned", ...defaults } }),
	});

/** A "captioned" placed at the origin, 64x64, labelled `text`. */
const captionedObject = (text: string): ObjectState & Dimensions =>
	({
		id: "captioned-1",
		type: "captioned",
		cx: 0,
		cy: 0,
		width: 64,
		height: 64,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		text: { body: { text } },
	}) as unknown as ObjectState & Dimensions;

describe("applyObjectDefinition: a label text type", () => {
	it("places its caption with the doc layer's placement, which it does not declare", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "captioned", buildLabelDefinition());

		const region = registries.objectPartKind
			.get("captioned", TEXT_SLOT_PART_KIND)
			?.region?.(captionedObject("Lambda"), "body");
		expect(region).toEqual(
			calcLabelTextRegion(
				{ width: 64, height: 64 },
				{ text: "Lambda" },
				undefined,
			),
		);
		expect(region?.y).toBe(32 + 4);
	});

	it("widens its visual bounds by the caption, which it does not declare", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "captioned", buildLabelDefinition());

		const visualBounds = registries.objectVisualBounds.get("captioned");
		expect(visualBounds?.(captionedObject("Lambda"))).toEqual(
			calcLabelTextVisualBounds(
				{ width: 64, height: 64 },
				{ text: "Lambda" },
				undefined,
			),
		);
		expect(visualBounds?.(captionedObject(""))).toEqual({
			x: -32,
			y: -32,
			width: 64,
			height: 64,
		});
	});

	it("measures the caption with the type's own body defaults, the ones it is drawn with", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(
			registries,
			"captioned",
			buildLabelDefinition({ fontSize: 30 }),
		);
		const plain = createTestRegistries();
		applyObjectDefinition(plain, "captioned", buildLabelDefinition());

		const regionOf = (from: typeof registries) =>
			from.objectPartKind
				.get("captioned", TEXT_SLOT_PART_KIND)
				?.region?.(captionedObject("Lambda"), "body");
		expect(regionOf(registries)).toEqual(
			calcLabelTextRegion(
				{ width: 64, height: 64 },
				{ text: "Lambda" },
				{ fontSize: 30 },
			),
		);
		expect(regionOf(registries)?.height).toBeGreaterThan(
			regionOf(plain)?.height ?? Infinity,
		);
	});

	it("places its caption and widens its visual bounds where its labelRegion says", () => {
		const besideTheBox: ObjectDocLabelRegionCalculator = (box) => ({
			x: box.width / 2 + 10,
			y: -10,
			width: 50,
			height: 20,
		});
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "captioned", {
			...buildLabelDefinition(),
			labelRegion: besideTheBox,
		});

		expect(
			registries.objectPartKind
				.get("captioned", TEXT_SLOT_PART_KIND)
				?.region?.(captionedObject("Lambda"), "body"),
		).toEqual({ x: 42, y: -10, width: 50, height: 20 });
		const visualBounds = registries.objectVisualBounds.get("captioned");
		expect(visualBounds?.(captionedObject("Lambda"))).toEqual({
			x: -32,
			y: -32,
			width: 124,
			height: 64,
		});
		expect(visualBounds?.(captionedObject(""))).toEqual({
			x: -32,
			y: -32,
			width: 64,
			height: 64,
		});
	});

	it("hands its labelRegion the type's own body defaults", () => {
		const labelRegion = vi.fn(calcLabelTextRegion);
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "captioned", {
			...buildLabelDefinition({ fontSize: 30 }),
			labelRegion,
		});

		registries.objectPartKind
			.get("captioned", TEXT_SLOT_PART_KIND)
			?.region?.(captionedObject("Lambda"), "body");
		expect(labelRegion).toHaveBeenCalledWith(
			expect.objectContaining({ width: 64, height: 64 }),
			{ text: "Lambda" },
			expect.objectContaining({ fontSize: 30 }),
		);
	});

	it.each([
		[
			"visualBounds",
			{
				visualBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
			},
		],
		[
			'a "textSlot" part kind',
			{ partKinds: [createTextSlotPartKindDefinition()] },
		],
		["textRegion", { textRegion: calcFullBoxTextRegion }],
	])("refuses a type declaring %s of its own", (declared, extra) => {
		expect(() =>
			applyObjectDefinition(createTestRegistries(), "captioned", {
				...buildLabelDefinition(),
				...extra,
			} as ObjectTypeDefinition),
		).toThrow(
			`ObjectTypeDefinition "captioned": features.text "label" has its caption placed by the core from labelRegion (below the box when omitted, calcLabelTextRegion); remove its ${declared}`,
		);
	});

	it("accepts the undefined textRegion createFrameObjectDoc writes when none is given", () => {
		expect(() =>
			applyObjectDefinition(createTestRegistries(), "captioned", {
				...buildLabelDefinition(),
				textRegion: undefined,
			}),
		).not.toThrow();
	});
});
