import { describe, it, expect } from "vitest";

import { validateRequiredNumber } from "../validateNumberFields";

// ─── validateRequiredNumber ───────────────────────────────────────

describe("validateRequiredNumber", () => {
	it("no errors for a number", () => {
		expect(validateRequiredNumber({ w: 5 }, "root", "w")).toEqual([]);
	});

	it("errors for non-numbers (including missing)", () => {
		expect(validateRequiredNumber({}, "root", "w")).toEqual([
			{ path: "root.w", message: "must be a number", severity: "error" },
		]);
		expect(
			validateRequiredNumber({ w: "5" }, "root", "w")[0].message,
		).toContain("must be a number");
	});

	it("with min set, below the bound errors and the boundary has no errors", () => {
		expect(
			validateRequiredNumber({ w: -1 }, "root", "w", 0)[0].message,
		).toContain(">= 0");
		expect(validateRequiredNumber({ w: 0 }, "root", "w", 0)).toEqual([]);
		expect(
			validateRequiredNumber({ w: 0 }, "root", "w", 1)[0].message,
		).toContain(">= 1");
		expect(validateRequiredNumber({ w: 1 }, "root", "w", 1)).toEqual([]);
	});
});
