import { describe, it, expect } from "vitest";

import type { SemanticDiagnostic } from "../../../types/SemanticDiagnostic";
import { ARROW_STYLE_KEYS } from "../../base/ArrowStyleDoc";
import { FILL_STYLE_KEYS } from "../../base/FillStyleDoc";
import { RADIUS_STYLE_KEYS } from "../../base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "../../base/StrokeStyleDoc";
import { TEXT_INLINE_STYLE_KEYS } from "../../types/text/InlineTextStyle";
import { TEXT_SLOT_STYLE_KEYS } from "../../types/text/TextSlot";
import {
	validateArrowFields,
	validateFillStyleFields,
	validateRadiusStyleFields,
	validateStrokeStyleFields,
} from "../validateStyleFields";
import {
	validateInlineTextStyleFields,
	validateTextSlotStyleFields,
	validateTextStyleFields,
} from "../validateTextFields";

// The tables themselves stay private to their group's module, so each is
// exercised through the entry point that runs it through `validateFields`.

/** One style group's doc-side entry point, which is how its table is reached. */
type GroupValidator = (
	o: Record<string, unknown>,
	path: string,
) => SemanticDiagnostic[];

const fieldTables: [string, GroupValidator, readonly string[]][] = [
	["stroke", validateStrokeStyleFields, STROKE_STYLE_KEYS],
	["fill", validateFillStyleFields, FILL_STYLE_KEYS],
	["radius", validateRadiusStyleFields, RADIUS_STYLE_KEYS],
	["arrow", validateArrowFields, ARROW_STYLE_KEYS],
	["inline text", validateInlineTextStyleFields, TEXT_INLINE_STYLE_KEYS],
	["slot text", validateTextSlotStyleFields, TEXT_SLOT_STYLE_KEYS],
];

// Each table is keyed by `Record<keyof <the group's type>, …>`, so a group that
// gains a field the table misses fails to compile. What the type cannot state is
// the iteration order, which is the order the diagnostics come out in.
describe("validation driven by the field tables", () => {
	it.each(fieldTables)(
		"the %s table reports every key of the group, in their declared order",
		(_group, validate, keys) => {
			// null is admissible under none of the field validators, so every key
			// reports exactly once.
			const o = Object.fromEntries(keys.map((key) => [key, null]));
			expect(validate(o, "root").map((e) => e.path)).toEqual(
				keys.map((key) => `root.${key}`),
			);
		},
	);

	it.each(fieldTables)(
		"the %s table reads an explicitly undefined field as unspecified, like an absent one",
		(_group, validate, keys) => {
			const o = Object.fromEntries(keys.map((key) => [key, undefined]));
			expect(validate(o, "root")).toEqual([]);
		},
	);

	it("names the CSS property in the diagnostic of an inlined string", () => {
		expect(
			validateTextStyleFields({ fontFamily: "Arial; } body {" }, "root")[0]
				.message,
		).toBe("must be a safe CSS font-family value");
	});

	it("marks only the CSS-safety checks as beyond the JSON schema", () => {
		expect(
			validateStrokeStyleFields({ stroke: "red; } body {" }, "root")[0]
				.beyondSchema,
		).toBe(true);
		expect(
			validateStrokeStyleFields({ strokeWidth: -1 }, "root")[0].beyondSchema,
		).toBeUndefined();
		expect(
			validateStrokeStyleFields({ strokeDashType: "double" }, "root")[0]
				.beyondSchema,
		).toBeUndefined();
	});
});
