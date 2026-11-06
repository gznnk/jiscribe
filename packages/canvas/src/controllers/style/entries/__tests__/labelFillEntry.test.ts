import { describe, it, expect } from "vitest";

import { contextOf, ellipseOf } from "../../__tests__/support/styleFixtures";
import { labelFillEntry } from "../labelFillEntry";

describe("labelFillEntry", () => {
	it("writes the color onto the object itself", () => {
		const a = ellipseOf("a");
		expect(
			(
				labelFillEntry.apply(a, null, "#ffffff", contextOf()) as Record<
					string,
					unknown
				>
			).labelFill,
		).toBe("#ffffff");
	});

	it("returns the object itself when the color is already there", () => {
		const a = ellipseOf("a", { labelFill: "#ffffff" });
		expect(labelFillEntry.apply(a, null, "#ffffff", contextOf())).toBe(a);
	});

	it("reads an object stating none as auto, the knockout it is drawn with", () => {
		expect(labelFillEntry.read(ellipseOf("a"), null, contextOf())).toEqual([
			"auto",
		]);
		expect(
			labelFillEntry.read(
				ellipseOf("a", { labelFill: "#ffffff" }),
				null,
				contextOf(),
			),
		).toEqual(["#ffffff"]);
	});
});
