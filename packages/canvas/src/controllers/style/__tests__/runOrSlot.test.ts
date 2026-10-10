import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import {
	contextOf,
	rangeOf,
	rectOf,
	slotPickOf,
	textRectOf,
} from "./support/styleFixtures";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { createObjectPartKindRegistry } from "../../selection/ObjectPartKindRegistry";
import { TEXT_SLOT_PART_KIND } from "../../selection/textSlotPartKind";
import { runOrSlot } from "../entries/runOrSlot";
import { defaultSlotsOf } from "../entries/slotEntry";

const entry = runOrSlot("fontColor", {
	slotsOf: defaultSlotsOf,
});

const slotsOf = (object: unknown): TextSlots =>
	(object as { text: TextSlots }).text;

/** The context of a walk whose editor has the stretch of `a`'s body slot selected. */
const editing = (start: number, end: number, objectId = "a") =>
	contextOf({ textEditRange: rangeOf(objectId, start, end) });

describe("runOrSlot with a stretch of text selected", () => {
	describe("apply", () => {
		it("styles those characters alone, leaving the slot's own styling", () => {
			const a = textRectOf("a", { body: { text: "hello", fontSize: 12 } });
			const updated = entry.apply(a, null, "#d33", editing(0, 2));
			expect(slotsOf(updated).body).toEqual({
				text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }],
				fontSize: 12,
			});
		});

		it("styles each row's share of a stretch reaching over a row boundary", () => {
			const a = textRectOf("a", { body: { text: ["ab", "cd"] } });
			// The rows read as "ab\ncd", which is what the offsets count in.
			const updated = entry.apply(a, null, "#d33", editing(1, 4));
			expect(slotsOf(updated).body.text).toEqual([
				[{ text: "a" }, { text: "b", fontColor: "#d33" }],
				[{ text: "c", fontColor: "#d33" }, { text: "d" }],
			]);
		});

		it("a range naming another object → the whole slot takes it", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			const updated = entry.apply(a, null, "#d33", editing(0, 2, "other"));
			expect(slotsOf(updated).body).toEqual({
				text: "hello",
				fontColor: "#d33",
			});
		});

		it("a range naming a slot the object does not hold → the whole slot takes it", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			const updated = entry.apply(
				a,
				null,
				"#d33",
				contextOf({ textEditRange: rangeOf("a", 0, 2, "missing") }),
			);
			expect(slotsOf(updated).body).toEqual({
				text: "hello",
				fontColor: "#d33",
			});
		});
	});

	describe("read", () => {
		it("a stretch drawn in one color → that one value", () => {
			const a = textRectOf("a", {
				body: { text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }] },
			});
			expect(entry.read(a, null, editing(0, 2))).toEqual(["#d33"]);
		});

		it("a stretch the color is not uniform in → the value of every run it covers", () => {
			const a = textRectOf("a", {
				body: {
					text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }],
					fontColor: "#111",
				},
			});
			expect(entry.read(a, null, editing(0, 5))).toEqual(["#d33", "#111"]);
		});

		it("an unstyled stretch → the slot's own value, which is what it is drawn with", () => {
			const a = textRectOf("a", {
				body: { text: "hello", fontColor: "#111" },
			});
			expect(entry.read(a, null, editing(1, 3))).toEqual(["#111"]);
		});

		it("an unstyled stretch of a slot stating nothing → its type's default", () => {
			const textStyleDefaults = createObjectTextStyleDefaultsRegistry();
			textStyleDefaults.register("rect", {
				bySlot: { body: { fontColor: "#222" } },
			});
			const a = textRectOf("a", { body: { text: "hello" } });
			expect(
				entry.read(a, null, {
					...editing(1, 3),
					textStyleDefaults,
				}),
			).toEqual(["#222"]);
		});

		it("a range naming another object → the slots are read instead", () => {
			const a = textRectOf("a", {
				body: { text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }] },
				caption: { text: "x", fontColor: "#111" },
			});
			expect(entry.read(a, null, editing(0, 2, "other"))).toEqual([
				undefined,
				"#111",
			]);
		});
	});
});

describe("runOrSlot with no stretch selected", () => {
	describe("apply", () => {
		it("writes the slot and drops the property from the runs that overrode it", () => {
			const a = textRectOf("a", {
				body: {
					text: [
						{ text: "he", fontWeight: "bold", fontColor: "#d33" },
						{ text: "llo" },
					],
				},
			});
			const updated = entry.apply(a, null, "#00f", contextOf());
			// The runs keep the rest of their styling; the stripped text collapses
			// back to a plain string once nothing is styled on its own.
			expect(slotsOf(updated).body).toEqual({
				text: [{ text: "he", fontWeight: "bold" }, { text: "llo" }],
				fontColor: "#00f",
			});
		});

		it("drops it from the runs of a row too, each row being a body of its own", () => {
			const a = textRectOf("a", {
				body: { text: ["id", [{ text: "email", fontColor: "#d33" }]] },
			});
			const updated = entry.apply(a, null, "#00f", contextOf());
			expect(slotsOf(updated).body).toEqual({
				text: ["id", "email"],
				fontColor: "#00f",
			});
		});

		it("writes every slot while nothing is picked below the object", () => {
			const a = textRectOf("a", {
				name: { text: "User" },
				rows: { text: ["id"] },
			});
			expect(slotsOf(entry.apply(a, null, "#00f", contextOf()))).toEqual({
				name: { text: "User", fontColor: "#00f" },
				rows: { text: ["id"], fontColor: "#00f" },
			});
		});

		it("writes the picked slot alone", () => {
			const a = textRectOf("a", {
				name: { text: "User" },
				rows: { text: ["id"] },
			});
			expect(
				slotsOf(entry.apply(a, slotPickOf("rows"), "#00f", contextOf())),
			).toEqual({
				name: { text: "User" },
				rows: { text: ["id"], fontColor: "#00f" },
			});
		});

		it("writes every slot a picked range covers, from either end", () => {
			const a = textRectOf("a", {
				name: { text: "User" },
				rows: { text: ["id"] },
				operations: { text: ["save()"] },
			});
			const range = {
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "operations", focusId: "rows" }],
			};
			expect(slotsOf(entry.apply(a, range, "#00f", contextOf()))).toEqual({
				name: { text: "User" },
				rows: { text: ["id"], fontColor: "#00f" },
				operations: { text: ["save()"], fontColor: "#00f" },
			});
		});

		it("refuses a slot pick on a type no slot kind is registered for", () => {
			const a = textRectOf("a", { name: { text: "User" } });
			expect(() =>
				entry.apply(
					a,
					slotPickOf("name"),
					"#00f",
					contextOf({ objectPartKind: createObjectPartKindRegistry() }),
				),
			).toThrow(/no "textSlot" part kind/);
		});

		it("keeps a field the slot's own type loaded onto it while stripping its runs", () => {
			// A table cell carries `fill`; narrowed to the fields TextSlot names, a
			// style change would clear every cell's background (TextSlots).
			const a = textRectOf("a", {
				"0_0": { text: [{ text: "id", fontColor: "#d33" }], fill: "#eef" },
			} as unknown as TextSlots);
			expect(slotsOf(entry.apply(a, null, "#00f", contextOf()))).toEqual({
				"0_0": { text: "id", fill: "#eef", fontColor: "#00f" },
			});
		});

		it("an object holding no text → null", () => {
			expect(entry.apply(rectOf("a"), null, "#00f", contextOf())).toBeNull();
		});
	});

	describe("read", () => {
		it("one value per slot", () => {
			const a = textRectOf("a", {
				name: { text: "User", fontColor: "#d33" },
				rows: { text: ["id"], fontColor: "#111" },
			});
			expect(entry.read(a, null, contextOf())).toEqual(["#d33", "#111"]);
		});

		it("the runs have no say — the write would strip them anyway", () => {
			const a = textRectOf("a", {
				body: {
					text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }],
					fontColor: "#111",
				},
			});
			expect(entry.read(a, null, contextOf())).toEqual(["#111"]);
		});
	});
});
