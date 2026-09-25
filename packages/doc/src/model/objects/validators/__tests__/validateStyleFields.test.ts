import { describe, it, expect } from "vitest";

import type { SemanticDiagnostic } from "../../../types/SemanticDiagnostic";
import {
	validateArrowFields,
	validateFillStyleFields,
	validateRadiusStyleFields,
	validateStrokeStyleFields,
} from "../validateStyleFields";

/** One style group's doc-side entry point, which is how its table is reached. */
type GroupValidator = (
	o: Record<string, unknown>,
	path: string,
) => SemanticDiagnostic[];

// ─── validateStrokeStyleFields ────────────────────────────────────

describe("validateStrokeStyleFields", () => {
	it("no errors when the stroke fields are missing", () => {
		expect(validateStrokeStyleFields({}, "root")).toEqual([]);
	});

	it("valid stroke fields have no errors", () => {
		const o = { stroke: "#000", strokeWidth: 2, strokeDashType: "solid" };
		expect(validateStrokeStyleFields(o, "root")).toEqual([]);
	});

	it("errors when stroke is not a string", () => {
		const errors = validateStrokeStyleFields({ stroke: 123 }, "root");
		expect(errors[0].path).toBe("root.stroke");
	});

	it("errors when stroke contains a CSS injection", () => {
		const errors = validateStrokeStyleFields(
			{ stroke: "red; } body { background: url(http://evil) " },
			"root",
		);
		expect(errors[0].path).toBe("root.stroke");
		// The CSS-safe check cannot be expressed in the JSON schema, so beyondSchema is set.
		expect(errors[0].beyondSchema).toBe(true);
	});

	it("errors when strokeWidth is not a number", () => {
		const errors = validateStrokeStyleFields({ strokeWidth: "2px" }, "root");
		expect(errors[0].path).toBe("root.strokeWidth");
	});

	it("errors for an invalid strokeDashType value", () => {
		const errors = validateStrokeStyleFields(
			{ strokeDashType: "double" },
			"root",
		);
		expect(errors[0].path).toBe("root.strokeDashType");
	});

	it("strokeDashType: dashed / dotted has no errors", () => {
		expect(
			validateStrokeStyleFields({ strokeDashType: "dashed" }, "root"),
		).toEqual([]);
		expect(
			validateStrokeStyleFields({ strokeDashType: "dotted" }, "root"),
		).toEqual([]);
	});
});

// ─── validateFillStyleFields ──────────────────────────────────────

describe("validateFillStyleFields", () => {
	it("no errors when fill is missing", () => {
		expect(validateFillStyleFields({}, "root")).toEqual([]);
	});

	it("fill as a string has no errors", () => {
		expect(validateFillStyleFields({ fill: "transparent" }, "root")).toEqual(
			[],
		);
	});

	it("errors when fill is not a string", () => {
		const errors = validateFillStyleFields({ fill: 0xff0000 }, "root");
		expect(errors[0].path).toBe("root.fill");
	});

	it("errors when fill contains a CSS breakout", () => {
		const errors = validateFillStyleFields(
			{ fill: "url(http://evil/x)" },
			"root",
		);
		expect(errors[0].path).toBe("root.fill");
	});
});
// ─── validateRadiusStyleFields ────────────────────────────────────

describe("validateRadiusStyleFields", () => {
	it("no errors when rx is missing", () => {
		expect(validateRadiusStyleFields({}, "root")).toEqual([]);
	});

	it("rx as a number has no errors", () => {
		expect(validateRadiusStyleFields({ rx: 8 }, "root")).toEqual([]);
		expect(validateRadiusStyleFields({ rx: 0 }, "root")).toEqual([]);
	});

	it("errors when rx is not a number", () => {
		const errors = validateRadiusStyleFields({ rx: "8px" }, "root");
		expect(errors[0].path).toBe("root.rx");
	});

	it("errors when rx is negative (>= 0)", () => {
		const errors = validateRadiusStyleFields({ rx: -1 }, "root");
		expect(errors[0].path).toBe("root.rx");
		expect(errors[0].message).toContain(">= 0");
	});
});

// ─── validateArrowFields ──────────────────────────────────────────

describe("validateArrowFields", () => {
	it("no errors when the arrow fields are missing", () => {
		expect(validateArrowFields({}, "root")).toEqual([]);
	});

	it("valid ArrowTypes have no errors", () => {
		const o = { startArrow: "FilledTriangle", endArrow: "None" };
		expect(validateArrowFields(o, "root")).toEqual([]);
	});

	it("errors for an invalid startArrow value", () => {
		const errors = validateArrowFields({ startArrow: "arrow" }, "root");
		expect(errors[0].path).toBe("root.startArrow");
	});

	it("errors for an invalid endArrow value", () => {
		const errors = validateArrowFields({ endArrow: "diamond" }, "root");
		expect(errors[0].path).toBe("root.endArrow");
	});

	it("all ArrowType values have no errors", () => {
		const validTypes = [
			"FilledTriangle",
			"ConcaveTriangle",
			"OpenArrow",
			"HollowTriangle",
			"FilledDiamond",
			"HollowDiamond",
			"Circle",
			"None",
		];
		for (const t of validTypes) {
			expect(validateArrowFields({ startArrow: t }, "root")).toEqual([]);
		}
	});
});
// ─── Lower bounds for optional number fields ─────────────────────

describe("lower bounds for numeric style fields", () => {
	it("negative strokeWidth errors (>= 0), unspecified is allowed", () => {
		expect(
			validateStrokeStyleFields({ strokeWidth: -1 }, "root")[0].message,
		).toContain(">= 0");
		expect(validateStrokeStyleFields({}, "root")).toEqual([]);
		expect(validateStrokeStyleFields({ strokeWidth: 0 }, "root")).toEqual([]);
	});
});

// ─── Paint opacity, bounded at both ends ─────────────────────────

describe("paint opacity", () => {
	// The two are one range held by one validator, so they are exercised as a pair.
	const opacityFields: [string, GroupValidator][] = [
		["fillOpacity", validateFillStyleFields],
		["strokeOpacity", validateStrokeStyleFields],
	];

	it.each(opacityFields)(
		"%s accepts 0, 1 and a value between",
		(key, validate) => {
			for (const value of [0, 1, 0.5]) {
				expect(validate({ [key]: value }, "root")).toEqual([]);
			}
		},
	);

	it.each(opacityFields)("%s names both ends when refused", (key, validate) => {
		expect(validate({ [key]: 1.5 }, "root")[0].message).toBe(
			"must be a number between 0 and 1",
		);
	});

	it.each(opacityFields)(
		"%s refuses anything outside the range or not a number",
		(key, validate) => {
			for (const value of [-0.1, 1.5, "0.5", null, Number.NaN]) {
				expect(validate({ [key]: value }, "root")).toHaveLength(1);
			}
		},
	);

	it.each(opacityFields)("%s unspecified is allowed", (key, validate) => {
		expect(validate({}, "root")).toEqual([]);
		expect(validate({ [key]: undefined }, "root")).toEqual([]);
	});
});
