import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { SelectPreviousTextSlotCommand } from "../SelectPreviousTextSlotCommand";

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

describe("SelectPreviousTextSlotCommand", () => {
	it("is bound to Shift+Tab, so plain Tab cannot match it", () => {
		expect(SelectPreviousTextSlotCommand.shortcuts?.default).toEqual([
			{ code: "Tab", shift: true },
		]);
	});

	it("moves the selection to the previous slot", () => {
		const last = SelectPreviousTextSlotCommand.execute(
			baseState({}),
			registries,
		);
		expect(last.selectedTextSlot).toEqual({
			objectId: "rec-1",
			slotId: "attributes",
		});
		expect(
			SelectPreviousTextSlotCommand.execute(last, registries).selectedTextSlot,
		).toEqual({ objectId: "rec-1", slotId: "name" });
	});

	it("is executable for a single selection that spells its text out as slots", () => {
		expect(
			SelectPreviousTextSlotCommand.canExecute(baseState({}), registries),
		).toBe(true);
	});

	it("is not executable for a multiple selection", () => {
		expect(
			SelectPreviousTextSlotCommand.canExecute(
				baseState({ selectedIds: ["rec-1", "rec-2"] }),
				registries,
			),
		).toBe(false);
	});
});
