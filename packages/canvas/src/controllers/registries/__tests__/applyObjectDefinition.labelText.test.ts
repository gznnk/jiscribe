import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { calcFullBoxTextRegion } from "@jiscribe/doc/plugin/ObjectDocTextRegion";
import {
	calcLabelTextRegion,
	calcLabelTextVisualBounds,
} from "@jiscribe/doc/text/label/calcLabelTextRegion";
import type { Dimensions } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

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

/** A `"label"` type the way most plugins declare one: no placement of its own. */
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

	it("registers the text slot kind and visual bounds it declares together, as they are", () => {
		const besideTheBox = (box: Dimensions) => ({
			x: box.width / 2 + 10,
			y: -10,
			width: 50,
			height: 20,
		});
		const declaredBounds = () => ({ x: -32, y: -32, width: 124, height: 64 });
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "captioned", {
			...buildLabelDefinition(),
			partKinds: [createTextSlotPartKindDefinition({ region: besideTheBox })],
			visualBounds: declaredBounds,
		});

		expect(
			registries.objectPartKind
				.get("captioned", TEXT_SLOT_PART_KIND)
				?.region?.(captionedObject("Lambda"), "body"),
		).toEqual({ x: 42, y: -10, width: 50, height: 20 });
		expect(registries.objectVisualBounds.get("captioned")).toBe(declaredBounds);
	});

	it.each([
		[
			"visualBounds",
			'a "textSlot" part kind',
			{
				visualBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
			},
		],
		[
			'a "textSlot" part kind',
			"visualBounds",
			{
				partKinds: [
					createTextSlotPartKindDefinition({ region: calcFullBoxTextRegion }),
				],
			},
		],
	])("refuses a type declaring %s without %s", (declared, missing, extra) => {
		expect(() =>
			applyObjectDefinition(createTestRegistries(), "captioned", {
				...buildLabelDefinition(),
				...extra,
			} as ObjectTypeDefinition),
		).toThrow(
			`ObjectTypeDefinition "captioned": features.text "label" places its caption itself only by declaring both a "textSlot" part kind and visualBounds; declares ${declared} but no ${missing}`,
		);
	});

	it("refuses a declared text slot kind placing nothing, which would spread the caption over the box", () => {
		expect(() =>
			applyObjectDefinition(createTestRegistries(), "captioned", {
				...buildLabelDefinition(),
				partKinds: [createTextSlotPartKindDefinition()],
				visualBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
			}),
		).toThrow(
			'ObjectTypeDefinition "captioned": features.text "label" declares a "textSlot" part kind with no region or regions, which would place the caption over the whole box',
		);
	});

	it("refuses a doc textRegion of its own", () => {
		expect(() =>
			applyObjectDefinition(createTestRegistries(), "captioned", {
				...buildLabelDefinition(),
				textRegion: calcFullBoxTextRegion,
			}),
		).toThrow(
			'ObjectTypeDefinition "captioned": features.text "label" has its caption placed on the canvas side (under the box by the core, calcLabelTextRegion, or by a declared "textSlot" part kind); remove its doc textRegion',
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
