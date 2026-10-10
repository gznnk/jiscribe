import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import {
	contextOf,
	rectOf,
	slotPickOf,
	textRectOf,
} from "../../__tests__/support/styleFixtures";
import { defaultSlotsOf } from "../slotEntry";
import { slotFieldEntry } from "../slotFieldEntry";

const entry = slotFieldEntry("textAlign", {
	slotsOf: defaultSlotsOf,
});

const slotsOf = (object: unknown): TextSlots =>
	(object as { text: TextSlots }).text;

/** A two-slot shape, standing in for a record: one body and one row list. */
const keyedRect = (style: Record<string, unknown> = {}) =>
	textRectOf("a", {
		name: { text: "User", ...style },
		rows: { text: ["id"], ...style },
	});

describe("slotFieldEntry", () => {
	describe("apply", () => {
		it("writes the field into the slot, leaving its content and the rest of its styling", () => {
			const a = textRectOf("a", { body: { text: "hi", fontSize: 12 } });
			const updated = entry.apply(a, null, "right", contextOf());
			expect(slotsOf(updated).body).toEqual({
				text: "hi",
				fontSize: 12,
				textAlign: "right",
			});
		});

		it("writes every slot while nothing is picked below the object", () => {
			const updated = entry.apply(keyedRect(), null, "right", contextOf());
			expect(slotsOf(updated)).toEqual({
				name: { text: "User", textAlign: "right" },
				rows: { text: ["id"], textAlign: "right" },
			});
		});

		it("writes the picked slot alone, leaving the others as they were", () => {
			const a = keyedRect();
			const updated = entry.apply(a, slotPickOf("rows"), "right", contextOf());
			expect(slotsOf(updated)).toEqual({
				name: { text: "User" },
				rows: { text: ["id"], textAlign: "right" },
			});
			expect(slotsOf(updated).name).toBe(slotsOf(a).name);
		});

		it("keeps a field the slot's own type loaded onto it (a cell's fill)", () => {
			// Beyond what TextSlot names, which is a contract rather than an
			// accident: a write copies the slot instead of rebuilding it (TextSlots).
			const a = textRectOf("a", {
				"0_0": { text: "id", fill: "#eef" },
			} as unknown as TextSlots);
			expect(slotsOf(entry.apply(a, null, "center", contextOf()))).toEqual({
				"0_0": { text: "id", fill: "#eef", textAlign: "center" },
			});
		});

		it("an object holding no text → null", () => {
			expect(entry.apply(rectOf("a"), null, "right", contextOf())).toBeNull();
		});

		it("a pick naming a slot the object does not hold → null", () => {
			const a = keyedRect();
			expect(
				entry.apply(a, slotPickOf("missing"), "right", contextOf()),
			).toBeNull();
		});

		it("the value already on every slot → the object itself", () => {
			const a = keyedRect({ textAlign: "right" });
			expect(entry.apply(a, null, "right", contextOf())).toBe(a);
		});

		it("one of two slots already carrying it → the object changes, that slot does not", () => {
			const a = textRectOf("a", {
				name: { text: "User", textAlign: "right" },
				rows: { text: ["id"] },
			});
			const updated = entry.apply(a, null, "right", contextOf());
			expect(updated).not.toBe(a);
			expect(slotsOf(updated).name).toBe(slotsOf(a).name);
			expect(slotsOf(updated).rows.textAlign).toBe("right");
		});

		it("leaves the object it was given as it was", () => {
			const a = textRectOf("a", { body: { text: "hi" } });
			entry.apply(a, null, "right", contextOf());
			expect(slotsOf(a).body).toEqual({ text: "hi" });
		});
	});

	describe("read", () => {
		it("one value per slot, in the object's slot order", () => {
			const a = textRectOf("a", {
				name: { text: "User", textAlign: "right" },
				rows: { text: ["id"], textAlign: "left" },
			});
			expect(entry.read(a, null, contextOf())).toEqual(["right", "left"]);
		});

		it("the picked slot alone", () => {
			const a = textRectOf("a", {
				name: { text: "User", textAlign: "right" },
				rows: { text: ["id"], textAlign: "left" },
			});
			expect(entry.read(a, slotPickOf("rows"), contextOf())).toEqual(["left"]);
		});

		it("a slot stating nothing → its type's default for that very slot", () => {
			const textStyleDefaults = createObjectTextStyleDefaultsRegistry();
			textStyleDefaults.register("rect", {
				bySlot: { rows: { textAlign: "center" } },
			});
			const a = textRectOf("a", {
				name: { text: "User" },
				rows: { text: ["id"] },
			});
			expect(entry.read(a, null, contextOf({ textStyleDefaults }))).toEqual([
				undefined,
				"center",
			]);
		});

		it("an object holding no text → no value", () => {
			expect(entry.read(rectOf("a"), null, contextOf())).toEqual([]);
		});
	});
});
