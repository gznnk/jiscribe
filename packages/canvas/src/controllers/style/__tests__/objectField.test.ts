import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import { rectOf } from "./support/styleFixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { objectField } from "../entries/objectField";
import type { StyleContext } from "../StyleEntry";

const entry = objectField<ObjectState, string>("fill");

const contextOf = (
	shapeStyleDefaults = createObjectShapeStyleDefaultsRegistry(),
): StyleContext => ({ selected: true, shapeStyleDefaults });

const fillOf = (object: unknown): unknown =>
	(object as Record<string, unknown>).fill;

describe("objectField", () => {
	describe("apply", () => {
		it("writes the field, leaving the rest of the object alone", () => {
			const a = rectOf("a", { fill: "#fff", stroke: "#000" });
			const updated = entry.apply(a, null, "#f00", contextOf());
			expect(fillOf(updated)).toBe("#f00");
			expect((updated as unknown as { stroke: string }).stroke).toBe("#000");
		});

		it("writes a field the object did not carry at all", () => {
			const a = rectOf("a");
			expect(fillOf(entry.apply(a, null, "#f00", contextOf()))).toBe("#f00");
		});

		it("the value already there → the object itself", () => {
			const a = rectOf("a", { fill: "#f00" });
			expect(entry.apply(a, null, "#f00", contextOf())).toBe(a);
		});

		it("leaves the object it was given as it was", () => {
			const a = rectOf("a", { fill: "#fff" });
			entry.apply(a, null, "#f00", contextOf());
			expect(fillOf(a)).toBe("#fff");
		});
	});

	describe("read", () => {
		it("one value, the object's own", () => {
			expect(
				entry.read(rectOf("a", { fill: "#f00" }), null, contextOf()),
			).toEqual(["#f00"]);
		});

		it("nothing stated → the type's default", () => {
			const defaults = createObjectShapeStyleDefaultsRegistry();
			defaults.register("rect", { fill: "#fff" });
			expect(entry.read(rectOf("a"), null, contextOf(defaults))).toEqual([
				"#fff",
			]);
		});

		it("neither side stating one → the shared last resort", () => {
			expect(entry.read(rectOf("a"), null, contextOf())).toEqual([
				SHAPE_STYLE_FALLBACK.fill,
			]);
		});

		it("a field holding the wrong type reads as unset, so resolution takes over", () => {
			const defaults = createObjectShapeStyleDefaultsRegistry();
			defaults.register("rect", { fill: "#fff" });
			expect(
				entry.read(rectOf("a", { fill: 7 }), null, contextOf(defaults)),
			).toEqual(["#fff"]);
		});
	});
});
