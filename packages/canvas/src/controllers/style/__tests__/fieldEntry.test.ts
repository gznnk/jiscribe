import { describe, it, expect } from "vitest";

import { connectorOf, contextOf, rectOf } from "./support/styleFixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { fieldEntry } from "../entries/fieldEntry";
import type { ExtraStyleEntry } from "../StyleEntry";

const accentColor = fieldEntry("accentColor", "string");
const labelFill = fieldEntry("label.fill", "string");
const labelStrokeWidth = fieldEntry(["label", "strokeWidth"], "number");
const collapsed = fieldEntry("collapsed", "boolean");

const fieldOf = (object: unknown, field: string): unknown =>
	(object as Record<string, unknown>)[field];

const labelOf = (object: unknown): Record<string, unknown> =>
	(object as { label: Record<string, unknown> }).label;

/**
 * `apply` as the walkers reach it: through the table, where the value is
 * untyped — which is how a value of the wrong type can arrive at all.
 */
const applyUntyped = (
	entry: ExtraStyleEntry,
	object: ObjectState,
	value: unknown,
): ObjectState | null => entry.apply(object, null, value, contextOf());

describe("fieldEntry", () => {
	it("states the field it writes, the root of the path", () => {
		expect(accentColor.fields).toEqual(["accentColor"]);
		expect(labelFill.fields).toEqual(["label"]);
	});

	describe("apply", () => {
		it("writes the field the declaration names", () => {
			const a = rectOf("a");
			expect(
				fieldOf(
					accentColor.apply(a, null, "#336699", contextOf()),
					"accentColor",
				),
			).toBe("#336699");
		});

		it("the value already there → the object itself", () => {
			const a = rectOf("a", { accentColor: "#336699" });
			expect(accentColor.apply(a, null, "#336699", contextOf())).toBe(a);
		});

		it("leaves the object it was given as it was", () => {
			const a = rectOf("a", { accentColor: "auto" });
			accentColor.apply(a, null, "#336699", contextOf());
			expect(fieldOf(a, "accentColor")).toBe("auto");
		});

		it("reads a string as the declared number", () => {
			const c = connectorOf("c", { label: { text: "Yes" } });
			const updated = applyUntyped(labelStrokeWidth, c, "2");
			expect(labelOf(updated).strokeWidth).toBe(2);
		});

		it("a value already of the declared type is taken as it stands", () => {
			const c = connectorOf("c", { label: { text: "Yes" } });
			const updated = labelStrokeWidth.apply(c, null, 2, contextOf());
			expect(labelOf(updated).strokeWidth).toBe(2);
		});

		it("a string no number can be made of → applies to nothing", () => {
			const c = connectorOf("c", { label: { text: "Yes" } });
			expect(applyUntyped(labelStrokeWidth, c, "x")).toBeNull();
		});

		it("a value of neither the declared type nor a string → applies to nothing", () => {
			const a = rectOf("a");
			expect(applyUntyped(accentColor, a, 7)).toBeNull();
			expect(applyUntyped(accentColor, a, undefined)).toBeNull();
			expect(applyUntyped(collapsed, a, 1)).toBeNull();
		});

		it('reads a string as the declared boolean, anything but "true" being false', () => {
			const a = rectOf("a");
			expect(fieldOf(applyUntyped(collapsed, a, "true"), "collapsed")).toBe(
				true,
			);
			expect(fieldOf(applyUntyped(collapsed, a, "no"), "collapsed")).toBe(
				false,
			);
		});

		it("a declared boolean is also taken as the boolean it is", () => {
			const a = rectOf("a");
			expect(
				fieldOf(collapsed.apply(a, null, false, contextOf()), "collapsed"),
			).toBe(false);
		});

		it("a nested write merges into the parent, keeping what it holds", () => {
			const c = connectorOf("c", { label: { text: "Yes" } });
			const updated = labelFill.apply(c, null, "#f00", contextOf());
			expect(labelOf(updated)).toEqual({ text: "Yes", fill: "#f00" });
		});

		it("no parent to merge into → applies to nothing, rather than fabricating one", () => {
			const c = connectorOf("c");
			expect(labelFill.apply(c, null, "#f00", contextOf())).toBeNull();
		});

		it("a parent that is not a plain object → applies to nothing", () => {
			const c = connectorOf("c", { label: ["Yes"] });
			expect(labelFill.apply(c, null, "#f00", contextOf())).toBeNull();
		});

		it("leaves the parent it was given as it was", () => {
			const label = { text: "Yes" };
			const c = connectorOf("c", { label });
			labelFill.apply(c, null, "#f00", contextOf());
			expect(label).toEqual({ text: "Yes" });
		});
	});

	describe("read", () => {
		it("one value, the one stored", () => {
			expect(
				accentColor.read(
					rectOf("a", { accentColor: "#336699" }),
					null,
					contextOf(),
				),
			).toEqual(["#336699"]);
		});

		it("the nested value, the one stored", () => {
			expect(
				labelFill.read(
					connectorOf("c", { label: { fill: "#f00" } }),
					null,
					contextOf(),
				),
			).toEqual(["#f00"]);
		});

		it("a field the object states nothing for reads as unset", () => {
			expect(accentColor.read(rectOf("a"), null, contextOf())).toEqual([
				undefined,
			]);
		});

		it("a nested field whose parent is absent → no value, as a write reaches nothing", () => {
			expect(labelFill.read(connectorOf("c"), null, contextOf())).toEqual([]);
		});

		it("a parent that is not a plain object → no value either", () => {
			expect(
				labelFill.read(connectorOf("c", { label: ["Yes"] }), null, contextOf()),
			).toEqual([]);
		});

		it("a nested field the parent states nothing for reads as unset", () => {
			expect(
				labelFill.read(
					connectorOf("c", { label: { text: "Yes" } }),
					null,
					contextOf(),
				),
			).toEqual([undefined]);
		});
	});
});
