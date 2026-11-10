import { describe, expect, it } from "vitest";

import type { ObjectFeatures } from "../../model/objects/types/ObjectFeatures";
import type { ObjectDocDefinition } from "../ObjectDocDefinition";
import { calcFullBoxTextRegion } from "../ObjectDocTextRegion";
import { resolveDocDefinitions } from "../resolveDocDefinitions";

/** A caption-bearing type as a plugin would hand it in, with `extra` laid over it. */
const labelDefinition = ({
	features,
	...extra
}: Partial<Omit<ObjectDocDefinition, "features">> & {
	features?: Partial<ObjectFeatures>;
} = {}): ObjectDocDefinition => ({
	validateDoc: () => [],
	...extra,
	features: {
		type: "label-icon",
		geometry: "rect",
		text: "label",
		...features,
	},
});

const resolveWith = (definition: ObjectDocDefinition) =>
	resolveDocDefinitions({
		presetDefinitions: {},
		plugins: [{ id: "icons", objects: { "label-icon": definition } }],
	});

describe("resolveDocDefinitions: a label text type", () => {
	it("accepts one declaring no region of its own", () => {
		expect(resolveWith(labelDefinition()).get("label-icon")).toBeDefined();
	});

	it("accepts the undefined region createFrameObjectDoc writes when none is given", () => {
		expect(() =>
			resolveWith(labelDefinition({ textRegion: undefined })),
		).not.toThrow();
	});

	it("refuses a region of its own, the core placing the caption", () => {
		expect(() =>
			resolveWith(labelDefinition({ textRegion: calcFullBoxTextRegion })),
		).toThrow(
			'ObjectDocDefinition "label-icon": features.text "label" has its caption placed on the canvas side (under the box by the core, calcLabelTextRegion, unless the UI definition places it); declare no textRegion',
		);
	});

	it("refuses a vertical basis, there being no verticalAlign to measure", () => {
		expect(() =>
			resolveWith(labelDefinition({ features: { textVerticalBasis: true } })),
		).toThrow(
			'ObjectDocDefinition "label-icon": features.text "label" takes no verticalAlign, so textVerticalBasis has nothing to measure',
		);
	});

	it("refuses a geometry storing no width and height to place it under", () => {
		expect(() =>
			resolveWith(labelDefinition({ features: { geometry: "point" } })),
		).toThrow(
			'ObjectDocDefinition "label-icon": features.text "label" needs geometry "rect", the caption being placed under a stored width and height (declares "point")',
		);
	});
});

describe("resolveDocDefinitions: an innerLabel text type", () => {
	const innerLabel = (
		extra: Parameters<typeof labelDefinition>[0] = {},
	): ObjectDocDefinition =>
		labelDefinition({
			...extra,
			features: { text: "innerLabel", ...extra.features },
		});

	it("accepts one declaring no region of its own", () => {
		expect(resolveWith(innerLabel()).get("label-icon")).toBeDefined();
	});

	it("refuses a region of its own, naming its own text type", () => {
		expect(() =>
			resolveWith(innerLabel({ textRegion: calcFullBoxTextRegion })),
		).toThrow(
			'ObjectDocDefinition "label-icon": features.text "innerLabel" has its caption placed on the canvas side (by the UI definition\'s textSlot part kind); declare no textRegion',
		);
	});

	it("refuses a vertical basis and a geometry storing no width and height", () => {
		expect(() =>
			resolveWith(innerLabel({ features: { textVerticalBasis: true } })),
		).toThrow(
			'ObjectDocDefinition "label-icon": features.text "innerLabel" takes no verticalAlign',
		);
		expect(() =>
			resolveWith(innerLabel({ features: { geometry: "point" } })),
		).toThrow(
			'ObjectDocDefinition "label-icon": features.text "innerLabel" needs geometry "rect"',
		);
	});
});

describe("resolveDocDefinitions: a body text type", () => {
	it.each(["body", "source"] as const)(
		"refuses a %s type declaring no text region",
		(text) => {
			expect(() =>
				resolveWith(labelDefinition({ features: { text } })),
			).toThrow(
				`ObjectDocDefinition "label-icon": features.text "${text}" needs a textRegion, the body being laid out inside the box (calcFullBoxTextRegion for the whole of it)`,
			);
		},
	);

	it("accepts a slots type declaring none, its slots placed on its part kind", () => {
		expect(() =>
			resolveWith(labelDefinition({ features: { text: "slots" } })),
		).not.toThrow();
	});
});
