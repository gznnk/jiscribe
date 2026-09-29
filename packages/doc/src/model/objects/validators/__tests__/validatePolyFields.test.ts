import { describe, it, expect } from "vitest";

import { validatePolyFields } from "../validatePolyFields";

// ─── validatePolyFields ───────────────────────────────────────────

describe("validatePolyFields", () => {
	it("a valid points array has no errors", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			],
		};
		expect(validatePolyFields(o, "root")).toEqual([]);
	});

	it("no errors even with 3 or more points", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 5, y: 5 },
				{ x: 10, y: 0 },
			],
		};
		expect(validatePolyFields(o, "root")).toEqual([]);
	});

	it("errors when the points field is missing", () => {
		expect(validatePolyFields({}, "root")).toHaveLength(1);
	});

	it("errors when points is not an array", () => {
		expect(validatePolyFields({ points: "invalid" }, "root")).toHaveLength(1);
	});

	it("errors when a point is not { x, y }", () => {
		const o = { points: [{ x: 0 }, { x: 10, y: 10 }] };
		expect(validatePolyFields(o, "root")).toHaveLength(1);
	});

	it("errors when there is only 1 point (at least 2 required)", () => {
		const o = { points: [{ x: 0, y: 0 }] };
		expect(validatePolyFields(o, "root")).toHaveLength(1);
	});

	it("errors for an empty array", () => {
		expect(validatePolyFields({ points: [] }, "root")).toHaveLength(1);
	});

	it("with minPoints=3, 2 points is an error (for polygon)", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			],
		};
		const errors = validatePolyFields(o, "root", 3);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain("at least 3 points");
	});

	it("with minPoints=3, 3 points has no errors", () => {
		const o = {
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 5, y: 10 },
			],
		};
		expect(validatePolyFields(o, "root", 3)).toEqual([]);
	});

	it("the path is reflected in the error path", () => {
		const errors = validatePolyFields({}, "obj[0]");
		expect(errors[0].path).toBe("obj[0].points");
	});
});
