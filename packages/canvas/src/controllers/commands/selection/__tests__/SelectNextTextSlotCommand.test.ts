import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { SelectNextTextSlotCommand } from "../SelectNextTextSlotCommand";

const registries = createTestRegistries();

const baseState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		objects: {
			"rec-1": {
				id: "rec-1",
				type: "record",
				features: { text: "slots" },
				text: { name: { text: "User" }, attributes: { text: [] } },
			},
		},
		selectedIds: ["rec-1"],
		selectedTextSlot: null,
		eventStartSnapshot: null,
		...overrides,
	}) as unknown as CanvasControllerState;

describe("SelectNextTextSlotCommand", () => {
	it("is bound to Tab alone, so Shift+Tab cannot match it", () => {
		expect(SelectNextTextSlotCommand.shortcuts?.default).toEqual([
			{ code: "Tab" },
		]);
	});

	it("moves the selection to the next slot", () => {
		const first = SelectNextTextSlotCommand.execute(baseState({}), registries);
		expect(first.selectedTextSlot).toEqual({
			objectId: "rec-1",
			slotId: "name",
		});
		expect(
			SelectNextTextSlotCommand.execute(first, registries).selectedTextSlot,
		).toEqual({ objectId: "rec-1", slotId: "attributes" });
	});

	it("is executable for a single selection that spells its text out as slots", () => {
		expect(
			SelectNextTextSlotCommand.canExecute(baseState({}), registries),
		).toBe(true);
	});

	it("is not executable for a multiple selection", () => {
		expect(
			SelectNextTextSlotCommand.canExecute(
				baseState({ selectedIds: ["rec-1", "rec-2"] }),
				registries,
			),
		).toBe(false);
	});
});
