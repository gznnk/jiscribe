import { ARROW_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import { FILL_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import { RADIUS_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import { TEXT_INLINE_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/RichText";
import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/TextSlot";
import { describe, expect, it } from "vitest";

import {
	hasOwnedEndpoint,
	hasValidIdAndType,
	isValidArrowFields,
	isValidChildIds,
	isValidFillStyleState,
	isValidFrameState,
	isValidPolyState,
	isValidRadiusStyleState,
	isValidStrokeStyleState,
	isValidTextStyleState,
	isValidTransformState,
	type StateRecord,
} from "../validateStateUtils";

describe("validateStateUtils", () => {
	describe("hasValidIdAndType", () => {
		it("non-empty id and matching type is true", () => {
			expect(hasValidIdAndType({ id: "a", type: "rect" }, "rect")).toBe(true);
		});
		it("empty id / type mismatch / non-string id is false", () => {
			expect(hasValidIdAndType({ id: "", type: "rect" }, "rect")).toBe(false);
			expect(hasValidIdAndType({ id: "a", type: "ellipse" }, "rect")).toBe(
				false,
			);
			expect(hasValidIdAndType({ id: 1, type: "rect" }, "rect")).toBe(false);
		});
	});

	describe("isValidFrameState", () => {
		it("is true when cx/cy/width/height are numbers", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10, height: 10 })).toBe(
				true,
			);
		});
		it("is true even when cx/cy are negative (no lower bound on position)", () => {
			expect(isValidFrameState({ cx: -5, cy: -5, width: 10, height: 10 })).toBe(
				true,
			);
		});
		it("is false when width/height are negative (schema minimum: 0)", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: -1, height: 10 })).toBe(
				false,
			);
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10, height: -1 })).toBe(
				false,
			);
		});
		it("is false when any field is missing / non-numeric", () => {
			expect(isValidFrameState({ cx: 0, cy: 0, width: 10 })).toBe(false);
			expect(isValidFrameState({ cx: 0, cy: 0, width: "10", height: 10 })).toBe(
				false,
			);
		});
	});

	describe("isValidTransformState", () => {
		it("is true when rotation/scaleX/scaleY are numbers", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1, scaleY: 1 })).toBe(
				true,
			);
		});
		it("is false when a field is missing", () => {
			expect(isValidTransformState({ rotation: 0, scaleX: 1 })).toBe(false);
		});
	});

	describe("isValidStrokeStyleState", () => {
		// A real colour would reach isCssColor (CSS.supports), which this node
		// environment has no CSS for; the "auto" sentinel is checked before that.
		// Whether an actual colour passes is covered by the paste e2e.
		it("the auto sentinel and an omitted stroke have no errors", () => {
			expect(isValidStrokeStyleState({ stroke: "auto", strokeWidth: 2 })).toBe(
				true,
			);
			expect(isValidStrokeStyleState({})).toBe(true);
		});
		it("is false when strokeWidth is negative (schema minimum: 0)", () => {
			expect(isValidStrokeStyleState({ strokeWidth: -1 })).toBe(false);
		});
		it("strokeWidth of 0 is true", () => {
			expect(isValidStrokeStyleState({ strokeWidth: 0 })).toBe(true);
		});
		it("stroke containing CSS injection is false", () => {
			expect(isValidStrokeStyleState({ stroke: "red; } body {" })).toBe(false);
		});
		it("invalid strokeDashType is false", () => {
			expect(isValidStrokeStyleState({ strokeDashType: "double" })).toBe(false);
		});
	});

	describe("isValidFillStyleState", () => {
		it("the auto sentinel and an omitted fill are true", () => {
			expect(isValidFillStyleState({ fill: "auto" })).toBe(true);
			expect(isValidFillStyleState({})).toBe(true);
		});
		it("fill containing injection is false", () => {
			expect(isValidFillStyleState({ fill: "url(http://evil/x)" })).toBe(false);
		});
	});

	describe("isValidTextStyleState", () => {
		/** Wraps one slot's styling in the keyed normal form the state validator sees. */
		const withSlot = (style: Record<string, unknown>) => ({
			text: { body: { text: "hello", ...style } },
		});

		it("valid font is true", () => {
			expect(
				isValidTextStyleState(
					withSlot({ fontFamily: "Noto Sans JP", fontWeight: "600" }),
					"body",
				),
			).toBe(true);
		});
		// The bound is inclusive at 1; what it refuses is asserted for every inline
		// field at once in "fields driven by the style tables".
		it("fontSize is true from 1 up (schema minimum: 1)", () => {
			expect(isValidTextStyleState(withSlot({ fontSize: 1 }), "body")).toBe(
				true,
			);
			expect(isValidTextStyleState(withSlot({ fontSize: 12 }), "body")).toBe(
				true,
			);
		});
		it("valid fontStyle / textDecoration is true", () => {
			expect(
				isValidTextStyleState(
					withSlot({
						fontStyle: "italic",
						textDecoration: "underline line-through",
					}),
					"body",
				),
			).toBe(true);
		});
		it("checks the styling of every run, which is inlined into the same CSS", () => {
			expect(
				isValidTextStyleState(
					{ text: { body: { text: [{ text: "hi", fontWeight: "bold" }] } } },
					"body",
				),
			).toBe(true);
			expect(
				isValidTextStyleState(
					{
						text: {
							body: {
								text: [
									{ text: "safe" },
									{ text: "hi", fontFamily: "Arial; } body {" },
								],
							},
						},
					},
					"body",
				),
			).toBe(false);
			expect(
				isValidTextStyleState(
					{ text: { body: { text: [{ text: "hi", fontSize: 0 }] } } },
					"body",
				),
			).toBe(false);
		});

		it("checks the runs of a row too, a row being a body of its own", () => {
			/** Wraps rows in the keyed normal form, as a record's compartment holds them. */
			const withRows = (rows: unknown[]) => ({
				text: { attributes: { text: rows } },
			});

			expect(
				isValidTextStyleState(
					withRows(["id", [{ text: "name", fontWeight: "bold" }]]),
					"slots",
				),
			).toBe(true);
			expect(
				isValidTextStyleState(
					withRows(["id", [{ text: "name", fontFamily: "Arial; } body {" }]]),
					"slots",
				),
			).toBe(false);
			expect(
				isValidTextStyleState(
					withRows([[{ text: "name", fontStyle: "italic } html {" }]]),
					"slots",
				),
			).toBe(false);
			expect(
				isValidTextStyleState(
					withRows([[{ text: "name", fontSize: 0 }]]),
					"slots",
				),
			).toBe(false);
		});

		it("checks every slot, not only the first", () => {
			expect(
				isValidTextStyleState(
					{
						text: {
							name: { text: "User" },
							rows: { text: ["id"], fontSize: 0 },
						},
					},
					"slots",
				),
			).toBe(false);
		});

		// The key set is the authority on a shape's slots, so a "body" type that
		// arrives without `body`, or with a key beside it, would draw and edit a
		// slot that mapTextStateToDoc drops on save (issue #235).
		it("a body type must carry exactly the body slot", () => {
			expect(isValidTextStyleState({}, "body")).toBe(false);
			expect(isValidTextStyleState({ text: {} }, "body")).toBe(false);
			expect(
				isValidTextStyleState({ text: { weird: { text: "x" } } }, "body"),
			).toBe(false);
			expect(
				isValidTextStyleState(
					{ text: { body: { text: "hi" }, weird: { text: "x" } } },
					"body",
				),
			).toBe(false);
		});
		it("a slots type leaves the key set to its own validator", () => {
			expect(isValidTextStyleState({}, "slots")).toBe(true);
			expect(isValidTextStyleState({ text: {} }, "slots")).toBe(true);
			expect(
				isValidTextStyleState({ text: { anything: { text: "x" } } }, "slots"),
			).toBe(true);
		});
	});

	describe("isValidRadiusStyleState", () => {
		it("rx as a number / omitted is true", () => {
			expect(isValidRadiusStyleState({ rx: 4 })).toBe(true);
			expect(isValidRadiusStyleState({ rx: 0 })).toBe(true);
			expect(isValidRadiusStyleState({})).toBe(true);
		});
		it("is false when rx is negative (schema minimum: 0)", () => {
			expect(isValidRadiusStyleState({ rx: -1 })).toBe(false);
		});
		it("is false when rx is non-numeric", () => {
			expect(isValidRadiusStyleState({ rx: "4" })).toBe(false);
		});
	});

	describe("isValidArrowFields", () => {
		it("valid ArrowType / omitted is true", () => {
			expect(isValidArrowFields({ startArrow: "None" })).toBe(true);
			expect(isValidArrowFields({})).toBe(true);
		});
		it("invalid ArrowType is false", () => {
			expect(isValidArrowFields({ endArrow: "diamond" })).toBe(false);
		});
	});

	describe("isValidChildIds", () => {
		it("non-empty string array is true", () => {
			expect(isValidChildIds({ childIds: ["a", "b"] })).toBe(true);
		});
		it("empty array is false (reject empty group as a degenerate state)", () => {
			expect(isValidChildIds({ childIds: [] })).toBe(false);
		});
		it("non-array / non-string elements is false", () => {
			expect(isValidChildIds({ childIds: "a" })).toBe(false);
			expect(isValidChildIds({ childIds: ["a", 1] })).toBe(false);
		});
	});

	describe("isValidPolyState", () => {
		const pts = (n: number) =>
			Array.from({ length: n }, (_v, i) => ({ x: i, y: i }));

		it("points array meeting minPoints is true", () => {
			expect(isValidPolyState({ points: pts(2) }, 2)).toBe(true);
			expect(isValidPolyState({ points: pts(3) }, 3)).toBe(true);
		});
		it("below minPoints is false (thresholds polyline:2 / polygon:3)", () => {
			expect(isValidPolyState({ points: pts(1) }, 2)).toBe(false);
			expect(isValidPolyState({ points: pts(2) }, 3)).toBe(false);
		});
		it("no points is false", () => {
			expect(isValidPolyState({}, 2)).toBe(false);
		});
	});

	// Each table is keyed by `Record<keyof <the group's type>, …>`, the very type
	// the doc-side table is keyed by, so a group that gains a field the table
	// misses fails to compile on both sides. These are the runtime witnesses that
	// every key is actually reached, and that "absent" and "there but undefined"
	// read alike here as they do on the doc side.
	describe("fields driven by the style tables", () => {
		const fieldTables: [
			string,
			(o: StateRecord) => boolean,
			readonly string[],
		][] = [
			["stroke", isValidStrokeStyleState, STROKE_STYLE_KEYS],
			["fill", isValidFillStyleState, FILL_STYLE_KEYS],
			["radius", isValidRadiusStyleState, RADIUS_STYLE_KEYS],
			["arrow", isValidArrowFields, ARROW_STYLE_KEYS],
		];

		it.each(fieldTables)(
			"the %s table checks every key",
			(_group, isValid, keys) => {
				// null is admissible under none of the field validators, and none of them
				// reaches `CSS` with it (isCssSafeValue rejects a non-string first).
				for (const key of keys) {
					expect(isValid({ [key]: null })).toBe(false);
				}
			},
		);

		it.each(fieldTables)(
			"the %s table reads an explicitly undefined field as unspecified",
			(_group, isValid, keys) => {
				expect(
					isValid(Object.fromEntries(keys.map((key) => [key, undefined]))),
				).toBe(true);
			},
		);

		// The text tables are reached through a slot rather than a flat record, so
		// they need witnesses of their own. A `null` would not serve: `isTextSlot`
		// refuses it for every one of these fields before the table is consulted.
		// These values pass their declared type and must still be refused, which is
		// exactly what the table adds — the fontSize bound and CSS safety. One per
		// inline field, keyed by the field union, so a field the group gains has to
		// be given a value here too.
		const beyondDeclaredType: Record<
			(typeof TEXT_INLINE_STYLE_KEYS)[number],
			unknown
		> = {
			fontColor: "red; } body {",
			fontSize: 0,
			fontFamily: "Arial; } body {",
			fontWeight: "bold; } body {",
			fontStyle: "italic } html {",
			textDecoration: "underline } html {",
		};

		const slotOf = (style: Record<string, unknown>) => ({
			text: { body: { text: "hi", ...style } },
		});
		const runOf = (style: Record<string, unknown>) => ({
			text: { body: { text: [{ text: "hi", ...style }] } },
		});

		it.each(TEXT_INLINE_STYLE_KEYS)(
			"refuses a slot whose %s meets its declared type but not the table",
			(key) => {
				expect(
					isValidTextStyleState(
						slotOf({ [key]: beyondDeclaredType[key] }),
						"body",
					),
				).toBe(false);
			},
		);

		it.each(TEXT_INLINE_STYLE_KEYS)(
			"refuses a run whose %s meets its declared type but not the table",
			(key) => {
				expect(
					isValidTextStyleState(
						runOf({ [key]: beyondDeclaredType[key] }),
						"body",
					),
				).toBe(false);
			},
		);

		// The two alignment fields the slot table carries beyond the inline half get
		// no such case: `isTextSlot` checks them with the very guards the table does,
		// so no value tells the two apart. Their coverage is the type's, not a test's.
		it.each(TEXT_SLOT_STYLE_KEYS)(
			"reads a slot's %s as unspecified when it is there but undefined",
			(key) => {
				expect(
					isValidTextStyleState(slotOf({ [key]: undefined }), "body"),
				).toBe(true);
			},
		);

		it("accepts a slot whose alignment is valid, which only the table reaches here", () => {
			expect(
				isValidTextStyleState(
					slotOf({ textAlign: "center", verticalAlign: "middle" }),
					"body",
				),
			).toBe(true);
		});
	});

	describe("hasOwnedEndpoint", () => {
		const owned = {
			owner: { id: "r1" },
			anchor: { kind: "center" },
		};
		const free = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

		it("is true when either endpoint is owned", () => {
			expect(hasOwnedEndpoint(owned, free)).toBe(true);
			expect(hasOwnedEndpoint(free, owned)).toBe(true);
			expect(hasOwnedEndpoint(owned, owned)).toBe(true);
		});
		it("is false when both endpoints are free", () => {
			expect(hasOwnedEndpoint(free, free)).toBe(false);
		});
	});
});
