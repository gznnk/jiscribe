import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { registerTextSlotParts } from "../../../selection/__tests__/support/textSlotPartRegistry";
import { TEXT_SLOT_PART_KIND } from "../../../selection/textSlotPartKind";
import { SelectNextTextSlotCommand } from "../SelectNextTextSlotCommand";

const registries = createTestRegistries();
// "record" stands in for a plugin's slotted shape, which the built-in-only
// test bundle has never been told about.
registerTextSlotParts(registries.objectPartKind, "record");

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
		selection: selectionOf(["rec-1"]),
		activeDrag: null,
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
		expect(first.selection.part).toEqual({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "name", focusId: "name" }],
		});
		expect(
			SelectNextTextSlotCommand.execute(first, registries).selection.part,
		).toEqual({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "attributes", focusId: "attributes" }],
		});
	});

	it("is executable for a single selection that spells its text out as slots", () => {
		expect(
			SelectNextTextSlotCommand.canExecute(baseState({}), registries),
		).toBe(true);
	});

	it("is not executable for a multiple selection", () => {
		expect(
			SelectNextTextSlotCommand.canExecute(
				baseState({ selection: selectionOf(["rec-1", "rec-2"]) }),
				registries,
			),
		).toBe(false);
	});
});
