import { describe, expect, it } from "vitest";

import { stripUnknownViewFields } from "../stripUnknownViewFields";

describe("stripUnknownViewFields", () => {
	it("returns the input view itself when every mode is known", () => {
		const view = { open: "fit-width", scroll: "infinite", padding: { top: 8 } };
		const result = stripUnknownViewFields(view);
		expect(result.view).toBe(view);
		expect(result.warnings).toEqual([]);
	});

	it("returns a copy without the unknown field, and one warning per field", () => {
		const view = { open: "fit-diagonal", scroll: "page", padding: { top: 8 } };
		const result = stripUnknownViewFields(view);
		expect(result.view).not.toBe(view);
		expect(result.view).toEqual({ padding: { top: 8 } });
		// The input is left as it was: the caller decides what to do with the copy.
		expect(view.open).toBe("fit-diagonal");
		expect(result.warnings.map((warning) => warning.path)).toEqual([
			"view.open",
			"view.scroll",
		]);
		expect(result.warnings[0].severity).toBe("warning");
		expect(result.warnings[0].message).toContain('"fit-diagonal"');
	});

	it("leaves a non-string mode in place for validateViewDoc to reject", () => {
		const view = { open: 3, scroll: true };
		const result = stripUnknownViewFields(view);
		expect(result.view).toBe(view);
		expect(result.warnings).toEqual([]);
	});

	it.each([
		["undefined", undefined],
		["null", null],
		["a number", 7],
	])("returns %s as it is, without a warning", (_label, view) => {
		const result = stripUnknownViewFields(view);
		expect(result.view).toBe(view);
		expect(result.warnings).toEqual([]);
	});
});
