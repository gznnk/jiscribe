import { describe, expect, it } from "vitest";

import { measureTextSize } from "../measureTextSize";
import { createTextObjectFactory } from "../TextObjectFactory";

const TextObjectFactory = createTextObjectFactory(measureTextSize);

/** The box the factory measures for these overrides, as a whole size. */
const boxOf = (
	overrides?: Record<string, unknown>,
): { width: number; height: number } => {
	const { halfWidth, halfHeight } = TextObjectFactory.calcDimensions(overrides);
	return { width: halfWidth * 2, height: halfHeight * 2 };
};

describe("TextObjectFactory", () => {
	describe("createDoc", () => {
		it("centers the measured box on the position, storing its drawn top-left", () => {
			const overrides = { text: "Text" };
			const box = boxOf(overrides);
			const doc = TextObjectFactory.createDoc(
				{ x: 100, y: 100 },
				overrides,
			) as Record<string, unknown>;

			expect(doc.type).toBe("text");
			expect(doc.id).toEqual(expect.any(String));
			// Close rather than equal: the stored corner is rounded to the doc's own
			// coordinate precision (roundDocNumbers).
			expect(doc.x).toBeCloseTo(100 - box.width / 2, 3);
			expect(doc.y).toBeCloseTo(100 - box.height / 2, 3);
		});

		it("keeps the center a long text and a short one are placed on", () => {
			const short = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ text: "T" },
			) as unknown as { x: number };
			const long = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ text: "Long enough to matter" },
			) as unknown as { x: number };

			// The corner is where the text starts, so a wider text starts further left.
			expect(long.x).toBeLessThan(short.x);
			expect(short.x + boxOf({ text: "T" }).width / 2).toBeCloseTo(0, 3);
			expect(
				long.x + boxOf({ text: "Long enough to matter" }).width / 2,
			).toBeCloseTo(0, 3);
		});

		it("stores the corner the object's own rotation draws it at", () => {
			const overrides = { text: "Text", rotation: 90 };
			const box = boxOf(overrides);
			const doc = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				overrides,
			) as unknown as { x: number; y: number };

			// A quarter turn about the center puts the local top-left corner where the
			// local bottom-left one was.
			expect(doc.x).toBeCloseTo(box.height / 2, 10);
			expect(doc.y).toBeCloseTo(-box.width / 2, 10);
		});

		it("stores no width / height on the doc", () => {
			const doc = TextObjectFactory.createDoc({ x: 0, y: 0 }) as Record<
				string,
				unknown
			>;

			expect(doc).not.toHaveProperty("width");
			expect(doc).not.toHaveProperty("height");
		});

		it("drops width / height handed in as overrides", () => {
			const doc = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ width: 200, height: 40 },
			) as Record<string, unknown>;

			expect(doc).not.toHaveProperty("width");
			expect(doc).not.toHaveProperty("height");
		});

		it("keeps the width of a block text, which is the layout's own field", () => {
			const doc = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ textLayout: "block", width: 200, height: 40 },
			) as Record<string, unknown>;

			expect(doc.textLayout).toBe("block");
			expect(doc.width).toBe(200);
			// The height stays measured from the wrapped text in either layout.
			expect(doc).not.toHaveProperty("height");
			// That width is also the box the placement centers, so the corner is half of
			// it to the left rather than half of the longest line.
			expect(doc.x).toBe(-100);
		});

		it("assigns a different id on each creation", () => {
			const a = TextObjectFactory.createDoc({ x: 0, y: 0 });
			const b = TextObjectFactory.createDoc({ x: 0, y: 0 });
			expect(a.id).not.toBe(b.id);
		});
	});

	describe("calcDimensions", () => {
		it("reports half the box the text is measured at", () => {
			// Under the estimate measurement a line is fontSize x 0.6 per character, so
			// only the relations are asserted: a longer text is wider, and a bigger type
			// size is taller.
			const short = TextObjectFactory.calcDimensions({ text: "Text" });
			expect(short.halfWidth).toBeGreaterThan(0);
			expect(short.halfHeight).toBeGreaterThan(0);

			expect(
				TextObjectFactory.calcDimensions({ text: "Text Text" }).halfWidth,
			).toBeGreaterThan(short.halfWidth);
			expect(
				TextObjectFactory.calcDimensions({ text: "Text", fontSize: 32 })
					.halfHeight,
			).toBeGreaterThan(short.halfHeight);
		});

		it("measures a block text against the width it wraps in", () => {
			const wrapped = TextObjectFactory.calcDimensions({
				textLayout: "block",
				width: 60,
				text: "body copy long enough to wrap",
			});
			const label = TextObjectFactory.calcDimensions({
				text: "body copy long enough to wrap",
			});

			expect(wrapped.halfWidth).toBe(30);
			expect(wrapped.halfHeight).toBeGreaterThan(label.halfHeight);
		});
	});

	it("offers no bounds drawing: the shape does not own its box", () => {
		expect(TextObjectFactory.createDocFromBounds).toBeUndefined();
	});
});

describe("TextObjectFactory nested override aliasing", () => {
	// Overrides come from module-level stencil presets, so a nested value must be
	// copied into each created doc, never shared (same rule as createFrameObjectFactory).
	it("copies nested overrides instead of sharing the caller's object", () => {
		const stencilOverrides = { meta: { name: "preset" } };
		const first = TextObjectFactory.createDoc(
			{ x: 0, y: 0 },
			stencilOverrides,
		) as Record<string, unknown>;
		const second = TextObjectFactory.createDoc(
			{ x: 0, y: 0 },
			stencilOverrides,
		) as Record<string, unknown>;

		(first.meta as { name: string }).name = "edited";

		expect((second.meta as { name: string }).name).toBe("preset");
		expect(stencilOverrides.meta.name).toBe("preset");
	});
});
