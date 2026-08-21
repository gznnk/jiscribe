import { describe, expect, it } from "vitest";

import { TextObjectFactory } from "../TextObjectFactory";

describe("TextObjectFactory", () => {
	describe("createDoc", () => {
		it("stores the position as the box's top-left, without measuring", () => {
			const doc = TextObjectFactory.createDoc(
				{ x: 100, y: 100 },
				{ text: "Text" },
			) as Record<string, unknown>;

			expect(doc.type).toBe("text");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.x).toBe(100);
			expect(doc.y).toBe(100);
		});

		it("places a long text where a short one goes: the text no longer moves the corner", () => {
			const short = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ text: "T" },
			) as unknown as { x: number };
			const long = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ text: "Long enough to matter" },
			) as unknown as { x: number };

			expect(long.x).toBe(short.x);
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

		it("assigns a different id on each creation", () => {
			const a = TextObjectFactory.createDoc({ x: 0, y: 0 });
			const b = TextObjectFactory.createDoc({ x: 0, y: 0 });
			expect(a.id).not.toBe(b.id);
		});
	});

	describe("calcDimensions", () => {
		it("reports no extent: the doc holds no box for this layer to size", () => {
			expect(TextObjectFactory.calcDimensions({ text: "Text" })).toEqual({
				halfWidth: 0,
				halfHeight: 0,
			});
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
