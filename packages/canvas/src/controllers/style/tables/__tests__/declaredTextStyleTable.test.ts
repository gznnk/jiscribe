import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { selectedSlotIds } from "../../entries/slotEntry";
import type { SlotIdsOf } from "../../entries/slotEntry";
import type { StyleContext } from "../../StyleEntry";
import { declaredTextStyleTable } from "../declaredTextStyleTable";
import { textStyleTable } from "../textStyleTable";

/** Two slots, so a `slotIdsOf` naming one of them shows which one a write reached. */
const twoSlotObject = {
	id: "fixture-1",
	type: "fixture",
	text: {
		first: { text: "a" },
		second: { text: "b" },
	},
} as unknown as ObjectState;

/** Nothing the entries below consult beyond the slot defaults, which answer the slot itself. */
const ctx = {
	selected: true,
	textStyleDefaults: {
		resolveSlotStyle: (_type: string, _slotId: string, slot: object) => slot,
	},
	textEditRange: null,
} as unknown as StyleContext;

describe("declaredTextStyleTable", () => {
	it("takes the very kinds the derived text table does, the content included", () => {
		for (const textType of ["body", "slots", "source"] as const) {
			expect(
				Object.keys(declaredTextStyleTable(textType, selectedSlotIds)).sort(),
			).toEqual(Object.keys(textStyleTable(textType, selectedSlotIds)).sort());
		}
	});

	it("states the text field on every entry, which is what registration checks", () => {
		const table = declaredTextStyleTable("slots", selectedSlotIds);
		for (const entry of Object.values(table)) {
			expect(entry?.fields).toEqual(["text"]);
		}
	});

	it("writes and reads only the slots the declared slotIdsOf names", () => {
		const secondOnly: SlotIdsOf<ObjectState> = () => ["second"];
		const table = declaredTextStyleTable("slots", secondOnly);

		const written = table.fontWeight?.apply(twoSlotObject, null, "bold", ctx);

		expect(written).toMatchObject({
			text: { second: { text: "b", fontWeight: "bold" } },
		});
		expect(written).not.toHaveProperty("text.first.fontWeight");
		expect(table.fontWeight?.read(written!, null, ctx)).toEqual(["bold"]);
	});
});
