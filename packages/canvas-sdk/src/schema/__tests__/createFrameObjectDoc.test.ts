import type { ObjectDoc, ObjectFeatures } from "@workspace/canvas/doc";
import { describe, it, expect } from "vitest";

import { createFrameObjectDoc } from "../createFrameObjectDoc";

const DemoFeatures = {
	type: "sdkDemo",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
} as const satisfies ObjectFeatures;

const DEMO_DOC_DEFAULTS = {
	type: "sdkDemo",
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	fill: "transparent",
	stroke: "#000000",
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000000",
	fontSize: 16,
	fontFamily: "sans-serif",
	fontWeight: "normal",
};

const validDoc = { ...DEMO_DOC_DEFAULTS, id: "demo-1" } as unknown as Record<
	string,
	unknown
>;

describe("createFrameObjectDoc", () => {
	it("carries features / defaults / metadata into the definition", () => {
		const definition = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
			description: "Demo shape.",
			summary: "demo",
			outlineDescription: "Rectangle",
		});

		expect(definition.features).toBe(DemoFeatures);
		expect(definition.defaults).toBe(DEMO_DOC_DEFAULTS);
		expect(definition.description).toBe("Demo shape.");
		expect(definition.summary).toBe("demo");
		expect(definition.outlineDescription).toBe("Rectangle");
	});

	it("derives a doc validator from features", () => {
		const { validateDoc } = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
		});

		expect(validateDoc(validDoc, "objects[0]")).toEqual([]);

		const { height: _height, ...missingHeight } = validDoc;
		expect(validateDoc(missingHeight, "objects[0]").length).toBeGreaterThan(0);
	});

	it("appends validateExtra after the feature-derived checks", () => {
		const { validateDoc } = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
			validateExtra: (_o, path) => [{ path, message: "extra" }],
		});

		expect(validateDoc(validDoc, "objects[0]")).toEqual([
			{ path: "objects[0]", message: "extra" },
		]);
	});

	it("derives a factory that centers the shape on the given position", () => {
		const { factory } = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
		});

		expect(factory?.createDoc({ x: 100, y: 100 })).toMatchObject({
			type: "sdkDemo",
			x: 40,
			y: 60,
			width: 120,
			height: 80,
		});
		expect(factory?.createDocFromBounds).toBeDefined();
	});

	it("leaves createDocFromBounds off when supportsBounds is false", () => {
		const { factory } = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
			supportsBounds: false,
		});

		expect(factory?.createDocFromBounds).toBeUndefined();
	});

	it("registers a given factory as-is instead of deriving one", () => {
		const ownFactory = {
			createDoc: () => ({ ...DEMO_DOC_DEFAULTS, id: "own" }) as ObjectDoc,
			calcDimensions: () => ({ halfWidth: 1, halfHeight: 1 }),
		};

		const { factory } = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
			factory: ownFactory,
		});

		expect(factory).toBe(ownFactory);
		expect(factory?.createDocFromBounds).toBeUndefined();
	});
});
