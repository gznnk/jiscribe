import { describe, expect, it } from "vitest";

import { stickyDocDefinition } from "../../doc";
import { STICKY_DOC_DEFAULTS } from "../StickyDoc";

// stickyDocDefinition.factory is always set here (createFrameObjectDoc supplies it).
const StickyObjectFactory = stickyDocDefinition.factory!;

describe("StickyObjectFactory", () => {
	describe("createDoc", () => {
		it("creates a default-sized sticky centered on the position", () => {
			const doc = StickyObjectFactory.createDoc({ x: 100, y: 100 }) as Record<
				string,
				unknown
			>;

			expect(doc.type).toBe("sticky");
			expect(doc.id).toEqual(expect.any(String));
			expect(doc.width).toBe(STICKY_DOC_DEFAULTS.width);
			expect(doc.height).toBe(STICKY_DOC_DEFAULTS.height);
			expect(doc.x).toBe(100 - STICKY_DOC_DEFAULTS.width / 2);
			expect(doc.y).toBe(100 - STICKY_DOC_DEFAULTS.height / 2);
		});

		it("applies overridden width/height while keeping it centered", () => {
			const doc = StickyObjectFactory.createDoc(
				{ x: 50, y: 50 },
				{ width: 20, height: 10 },
			) as Record<string, unknown>;

			expect(doc.x).toBe(40); // 50 - 20 / 2
			expect(doc.y).toBe(45); // 50 - 10 / 2
		});
	});

	describe("calcDimensions", () => {
		it("returns the default half-size", () => {
			expect(StickyObjectFactory.calcDimensions()).toEqual({
				halfWidth: STICKY_DOC_DEFAULTS.width / 2,
				halfHeight: STICKY_DOC_DEFAULTS.height / 2,
			});
		});
	});

	it("does not have createDocFromBounds (click-to-center placement only)", () => {
		expect(StickyObjectFactory.createDocFromBounds).toBeUndefined();
	});
});
