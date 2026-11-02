import { describe, expect, it } from "vitest";

import { isDocEditingDrag } from "../viewer/isDocEditingDrag";

describe("isDocEditingDrag", () => {
	it("is false with no drag", () => {
		expect(isDocEditingDrag(null)).toBe(false);
	});

	it.each(["inert", "pan", "marquee"] as const)(
		"is false for a %s drag, which leaves the document as it is",
		(dragKind) => {
			expect(isDocEditingDrag(dragKind)).toBe(false);
		},
	);

	it.each(["menu", "move", "transform", "connector", "stencil"] as const)(
		"is true for a %s drag, whose edit lands on release",
		(dragKind) => {
			expect(isDocEditingDrag(dragKind)).toBe(true);
		},
	);
});
