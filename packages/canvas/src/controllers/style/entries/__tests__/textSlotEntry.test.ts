import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, expect, it } from "vitest";

import { createObjectPartKindRegistry } from "../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import { contextOf, textRectOf } from "../../__tests__/support/styleFixtures";
import { textSlotEntry } from "../textSlotEntry";

const entry = textSlotEntry<ReturnType<typeof textRectOf>, string>(
	"textAlign",
	(slot, value) => ({ ...slot, textAlign: value as "left" }),
);

/** A kind of the rect's own whose every pick reaches the `rows` slot alone. */
const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("rect", [
	{ kind: "band", has: () => true, textSlotIds: () => ["rows"] },
]);
const bandPick = { kind: "band", ranges: [{ anchorId: "0", focusId: "0" }] };

const keyedRect = () =>
	textRectOf("a", { name: { text: "User" }, rows: { text: ["id"] } });

describe("textSlotEntry", () => {
	it("writes the slots the picked kind reaches, and no other", () => {
		const updated = entry.apply(
			keyedRect(),
			bandPick,
			"right",
			contextOf({ objectPartKind }),
		);
		const slots = (updated as unknown as { text: TextSlots }).text;
		expect(slots.rows.textAlign).toBe("right");
		expect(slots.name.textAlign).toBeUndefined();
	});

	it("reads the slots the picked kind reaches, one value per slot", () => {
		expect(
			entry.read(keyedRect(), bandPick, contextOf({ objectPartKind })),
		).toEqual([undefined]);
		expect(entry.read(keyedRect(), null, contextOf())).toEqual([
			undefined,
			undefined,
		]);
	});

	it("hands the writer and a reader of its own the slot's styling resolved through its type's defaults", () => {
		const textStyleDefaults = createObjectTextStyleDefaultsRegistry();
		textStyleDefaults.register("rect", {
			everyTextSlot: { textAlign: "center" },
		});
		const echoEntry = textSlotEntry<ReturnType<typeof textRectOf>, string>(
			"textAlign",
			(slot, value, resolvedStyle) => ({
				...slot,
				fontColor: `${value}/${resolvedStyle.textAlign}`,
			}),
			(slot, resolvedStyle) => [`${slot.text}/${resolvedStyle.textAlign}`],
		);
		const ctx = contextOf({ textStyleDefaults });
		const updated = echoEntry.apply(keyedRect(), null, "x", ctx);
		expect(
			(updated as unknown as { text: TextSlots }).text.name.fontColor,
		).toBe("x/center");
		expect(echoEntry.read(keyedRect(), null, ctx)).toEqual([
			"User/center",
			"id/center",
		]);
	});
});
