import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { registerTextSlotParts } from "../../../selection/__tests__/support/textSlotPartRegistry";
import { TEXT_SLOT_PART_KIND } from "../../../selection/partKinds/textSlotPartKind";
import { SelectPreviousTextSlotCommand } from "../SelectPreviousTextSlotCommand";

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
		expect(last.selection.part).toEqual({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "attributes", focusId: "attributes" }],
		});
		expect(
			SelectPreviousTextSlotCommand.execute(last, registries).selection.part,
		).toEqual({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "name", focusId: "name" }],
		});
	});

	it("is executable for a single selection that spells its text out as slots", () => {
		expect(
			SelectPreviousTextSlotCommand.canExecute(baseState({}), registries),
		).toBe(true);
	});

	it("is not executable for a multiple selection", () => {
		expect(
			SelectPreviousTextSlotCommand.canExecute(
				baseState({ selection: selectionOf(["rec-1", "rec-2"]) }),
				registries,
			),
		).toBe(false);
	});
});
