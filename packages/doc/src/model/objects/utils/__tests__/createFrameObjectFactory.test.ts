import { describe, it, expect } from "vitest";

import { createFrameObjectFactory } from "../createFrameObjectFactory";

/** Minimal Frame-family DOC_DEFAULTS (top-left origin, x/y/width/height). */
const DEFAULTS = {
	type: "rect",
	x: 0,
	y: 0,
	width: 100,
	height: 60,
	fill: "#fff",
} as const;

/** DOC_DEFAULTS carrying a plain (non-geometry) field an override can replace. */
const TEXT_DEFAULTS = { ...DEFAULTS, fontFamily: "Noto Sans JP" } as const;

/** DOC_DEFAULTS with slotted text, the shape of a uml record's defaults. */
const SLOTTED_DEFAULTS = {
	...DEFAULTS,
	text: { name: { text: "" }, attributes: { text: [] as string[] } },
};

const asRecord = (doc: unknown): Record<string, unknown> =>
	doc as Record<string, unknown>;

describe("createFrameObjectFactory createDoc", () => {
	it("centers the default size on the given position", () => {
		const doc = asRecord(
			createFrameObjectFactory(DEFAULTS).createDoc({ x: 200, y: 300 }),
		);
		expect(doc).toMatchObject({ x: 150, y: 270, width: 100, height: 60 });
	});

	it("centers on the overridden size, not the default size", () => {
		const doc = asRecord(
			createFrameObjectFactory(DEFAULTS).createDoc(
				{ x: 200, y: 300 },
				{
					width: 40,
					height: 20,
				},
			),
		);
		expect(doc).toMatchObject({ x: 180, y: 290, width: 40, height: 20 });
	});

	it("ignores a non-finite size override and falls back to the default", () => {
		const doc = asRecord(
			createFrameObjectFactory(DEFAULTS).createDoc(
				{ x: 0, y: 0 },
				{
					width: "80",
				},
			),
		);
		expect(doc.x).toBe(-50);
	});

	it("carries the remaining defaults and assigns a fresh id each call", () => {
		const factory = createFrameObjectFactory(DEFAULTS);
		const first = asRecord(factory.createDoc({ x: 0, y: 0 }));
		const second = asRecord(factory.createDoc({ x: 0, y: 0 }));
		expect(first.type).toBe("rect");
		expect(first.fill).toBe("#fff");
		expect(first.id).toEqual(expect.any(String));
		expect(first.id).not.toBe(second.id);
	});

	it("gives each object its own copy of nested defaults", () => {
		const factory = createFrameObjectFactory(SLOTTED_DEFAULTS);
		const first = asRecord(factory.createDoc({ x: 0, y: 0 }));
		const second = asRecord(factory.createDoc({ x: 0, y: 0 }));

		(first.text as { name: { text: string } }).name.text = "edited";

		expect((second.text as { name: { text: string } }).name.text).toBe("");
		expect(SLOTTED_DEFAULTS.text.name.text).toBe("");
	});

	it("copies nested overrides instead of sharing the caller's object", () => {
		const factory = createFrameObjectFactory(SLOTTED_DEFAULTS);
		const stencilOverrides = { text: { name: { text: "Class" } } };
		const first = asRecord(factory.createDoc({ x: 0, y: 0 }, stencilOverrides));
		const second = asRecord(
			factory.createDoc({ x: 0, y: 0 }, stencilOverrides),
		);

		(first.text as { name: { text: string } }).name.text = "edited";

		expect((second.text as { name: { text: string } }).name.text).toBe("Class");
		expect(stencilOverrides.text.name.text).toBe("Class");
	});

	it("lets an override win over the built-in default", () => {
		const doc = asRecord(
			createFrameObjectFactory(TEXT_DEFAULTS).createDoc(
				{ x: 0, y: 0 },
				{
					fontFamily: "Explicit",
				},
			),
		);
		expect(doc.fontFamily).toBe("Explicit");
	});
});

describe("createFrameObjectFactory calcDimensions", () => {
	it("halves the default size", () => {
		expect(createFrameObjectFactory(DEFAULTS).calcDimensions()).toEqual({
			halfWidth: 50,
			halfHeight: 30,
		});
	});

	it("halves the overridden size", () => {
		expect(
			createFrameObjectFactory(DEFAULTS).calcDimensions({
				width: 40,
				height: 20,
			}),
		).toEqual({ halfWidth: 20, halfHeight: 10 });
	});
});

describe("createFrameObjectFactory createDocFromBounds", () => {
	it("normalizes a bounds dragged up-left into top-left origin plus size", () => {
		const doc = asRecord(
			createFrameObjectFactory(DEFAULTS).createDocFromBounds?.(90, 80, 10, 20),
		);
		expect(doc).toMatchObject({ x: 10, y: 20, width: 80, height: 60 });
	});

	it("returns null below the default 5px minimum on either axis", () => {
		const factory = createFrameObjectFactory(DEFAULTS);
		expect(factory.createDocFromBounds?.(0, 0, 4, 100)).toBeNull();
		expect(factory.createDocFromBounds?.(0, 0, 100, 4)).toBeNull();
		expect(factory.createDocFromBounds?.(0, 0, 5, 5)).not.toBeNull();
	});

	it("honors an explicit minimum size", () => {
		const factory = createFrameObjectFactory(DEFAULTS);
		expect(
			factory.createDocFromBounds?.(0, 0, 20, 20, undefined, 50),
		).toBeNull();
	});

	it("lets the drawn bounds win over a size override", () => {
		const doc = asRecord(
			createFrameObjectFactory(DEFAULTS).createDocFromBounds?.(0, 0, 80, 60, {
				width: 999,
				height: 999,
			}),
		);
		expect(doc).toMatchObject({ width: 80, height: 60 });
	});

	it("gives each drawn object its own copy of nested defaults", () => {
		const factory = createFrameObjectFactory(SLOTTED_DEFAULTS);
		const first = asRecord(factory.createDocFromBounds?.(0, 0, 80, 60));
		const second = asRecord(factory.createDocFromBounds?.(0, 0, 80, 60));

		(first.text as { name: { text: string } }).name.text = "edited";

		expect((second.text as { name: { text: string } }).name.text).toBe("");
	});

	it("is absent when the shape opts out of drag-drawing", () => {
		const factory = createFrameObjectFactory(DEFAULTS, {
			supportsBounds: false,
		});
		expect(factory.createDocFromBounds).toBeUndefined();
	});
});
