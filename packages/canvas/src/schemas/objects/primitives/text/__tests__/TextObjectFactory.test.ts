import { describe, expect, it } from "vitest";

import { calcTextObjectFrameSize } from "../calcTextObjectFrameSize";
import { TEXT_DOC_DEFAULTS } from "../TextDoc";
import { TextObjectFactory } from "../TextObjectFactory";

const sizeOf = (text: string) =>
	calcTextObjectFrameSize(text, TEXT_DOC_DEFAULTS, "Noto Sans JP");

describe("TextObjectFactory", () => {
	describe("createDoc", () => {
		it("centers the measured box on the position, like every other stencil drop", () => {
			const { width, height } = sizeOf("Text");
			const doc = TextObjectFactory.createDoc(
				{ x: 100, y: 100 },
				{ text: "Text" },
			) as Record<string, unknown>;

			expect(doc.type).toBe("text");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.x).toBe(100 - width / 2);
			expect(doc.y).toBe(100 - height / 2);
		});

		it("stores no width / height on the doc", () => {
			const doc = TextObjectFactory.createDoc({ x: 0, y: 0 }) as Record<
				string,
				unknown
			>;

			expect(doc).not.toHaveProperty("width");
			expect(doc).not.toHaveProperty("height");
		});

		it("measures the overridden text, so a longer default lands wider", () => {
			const short = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ text: "T" },
			) as unknown as { x: number };
			const long = TextObjectFactory.createDoc(
				{ x: 0, y: 0 },
				{ text: "Long enough to matter" },
			) as unknown as { x: number };

			expect(long.x).toBeLessThan(short.x);
		});

		it("assigns a different id on each creation", () => {
			const a = TextObjectFactory.createDoc({ x: 0, y: 0 });
			const b = TextObjectFactory.createDoc({ x: 0, y: 0 });
			expect(a.id).not.toBe(b.id);
		});
	});

	describe("calcDimensions", () => {
		it("reports the half-extents of the measured box", () => {
			const { width, height } = sizeOf("Text");

			expect(TextObjectFactory.calcDimensions({ text: "Text" })).toEqual({
				halfWidth: width / 2,
				halfHeight: height / 2,
			});
		});
	});

	it("offers no bounds drawing: the shape does not own its box", () => {
		expect(TextObjectFactory.createDocFromBounds).toBeUndefined();
	});
});
