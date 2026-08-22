import { describe, it, expect } from "vitest";

import { validateGroupDoc } from "../validateGroupDoc";

describe("validateGroupDoc", () => {
	it("yields no error for an empty object", () => {
		expect(validateGroupDoc({}, "root")).toEqual([]);
	});

	it("yields no error for valid transform fields", () => {
		expect(
			validateGroupDoc({ rotation: 90, flipX: false, flipY: true }, "root"),
		).toEqual([]);
	});

	it("is an error when rotation is not a number", () => {
		const errors = validateGroupDoc({ rotation: "90deg" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it("is an error when flipX is not a boolean", () => {
		const errors = validateGroupDoc({ flipX: 1 }, "root");
		expect(errors.some((e) => e.path === "root.flipX")).toBe(true);
	});

	it("yields no error here since children are validated by validateStructure", () => {
		// The contents of children are outside validateGroupDoc's responsibility
		expect(validateGroupDoc({ children: "invalid" }, "root")).toEqual([]);
	});

	// ─── Additional coverage ───
	it("is an error when flipY is not a boolean", () => {
		const errors = validateGroupDoc({ flipY: "yes" }, "root");
		expect(errors.some((e) => e.path === "root.flipY")).toBe(true);
	});

	it("reports all invalid transform fields", () => {
		const errors = validateGroupDoc(
			{ rotation: "x", flipX: 1, flipY: 0 },
			"root",
		);
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
		expect(errors.some((e) => e.path === "root.flipX")).toBe(true);
		expect(errors.some((e) => e.path === "root.flipY")).toBe(true);
	});

	it("does not validate stroke/fill/x since group has no geometry/style", () => {
		// Anything other than transform (stroke/fill/coordinates) is outside group's responsibility and passes through
		expect(
			validateGroupDoc({ stroke: "a;b", fill: 1, x: "no" }, "root"),
		).toEqual([]);
	});
});
