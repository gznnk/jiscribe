import { describe, it, expect } from "vitest";

import { contextOf, ellipseOf } from "../../__tests__/support/styleFixtures";
import { textVerticalBasisEntry } from "../textVerticalBasisEntry";

const basisOf = (object: unknown): unknown =>
	(object as Record<string, unknown>).textVerticalBasis;

/** A target reached through a selected group rather than selected itself. */
const asDescendant = contextOf({ selected: false });

describe("textVerticalBasisEntry", () => {
	describe("apply", () => {
		it("the frame basis is written into the field", () => {
			const a = ellipseOf("a");
			expect(
				basisOf(textVerticalBasisEntry.apply(a, null, "frame", contextOf())),
			).toBe("frame");
		});

		it("the region basis removes the field, its absence being how it is spelled", () => {
			const a = ellipseOf("a", { textVerticalBasis: "frame" });
			const updated = textVerticalBasisEntry.apply(
				a,
				null,
				"region",
				contextOf(),
			);
			expect(updated).not.toBeNull();
			expect("textVerticalBasis" in (updated as object)).toBe(false);
		});

		it("the basis already in force → the object itself", () => {
			const onFrame = ellipseOf("a", { textVerticalBasis: "frame" });
			expect(
				textVerticalBasisEntry.apply(onFrame, null, "frame", contextOf()),
			).toBe(onFrame);
			const onRegion = ellipseOf("a");
			expect(
				textVerticalBasisEntry.apply(onRegion, null, "region", contextOf()),
			).toBe(onRegion);
		});

		it("a descendant of a selected group is not switched with it", () => {
			const a = ellipseOf("a");
			expect(
				textVerticalBasisEntry.apply(a, null, "frame", asDescendant),
			).toBeNull();
		});

		it("leaves the object it was given as it was", () => {
			const a = ellipseOf("a", { textVerticalBasis: "frame" });
			textVerticalBasisEntry.apply(a, null, "region", contextOf());
			expect(basisOf(a)).toBe("frame");
		});
	});

	describe("read", () => {
		it("a switched body reads as the frame basis", () => {
			expect(
				textVerticalBasisEntry.read(
					ellipseOf("a", { textVerticalBasis: "frame" }),
					null,
					contextOf(),
				),
			).toEqual(["frame"]);
		});

		it("an absent field reads as the region", () => {
			expect(
				textVerticalBasisEntry.read(ellipseOf("a"), null, contextOf()),
			).toEqual(["region"]);
		});

		it("a descendant of a selected group has no say", () => {
			expect(
				textVerticalBasisEntry.read(
					ellipseOf("a", { textVerticalBasis: "frame" }),
					null,
					asDescendant,
				),
			).toEqual([]);
		});
	});
});
