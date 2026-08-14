import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { EscapeSelectionCommand } from "../EscapeSelectionCommand";

const registries = createTestRegistries();

const baseState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		objects: {},
		selectedIds: [],
		selectedConnectorId: null,
		selectedVertex: null,
		selectedTextSlot: null,
		multiSelectGroup: null,
		areaSelection: null,
		shapeDrawing: null,
		eventStartSnapshot: null,
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
		edgeScrollEnabled: false,
		...overrides,
	}) as unknown as CanvasControllerState;

/** A record whose slot selection is live: sole selection, slot still present. */
const slotSelectedState = (): CanvasControllerState =>
	baseState({
		objects: {
			"rec-1": {
				id: "rec-1",
				type: "record",
				features: { text: "slots" },
				text: { name: { text: "User" }, rows: { text: [] } },
			},
		} as never,
		selectedIds: ["rec-1"],
		selectedTextSlot: { objectId: "rec-1", slotId: "rows" },
	});

describe("EscapeSelectionCommand", () => {
	it("clears all selection and editing state when no text slot is selected", () => {
		const state = baseState({
			selectedIds: ["a", "b"],
			selectedConnectorId: "c1",
			selectedVertex: { objectId: "p1", vertexIndex: 0 },
			multiSelectGroup: { id: "ms" } as never,
			areaSelection: { x: 0, y: 0 } as never,
			shapeDrawing: { type: "rect" } as never,
			objectMenuOpenId: "a",
			edgeScrollEnabled: true,
		});
		const next = EscapeSelectionCommand.execute(state, registries);
		expect(next.selectedIds).toEqual([]);
		expect(next.selectedConnectorId).toBeNull();
		expect(next.selectedVertex).toBeNull();
		expect(next.multiSelectGroup).toBeNull();
		expect(next.areaSelection).toBeNull();
		expect(next.shapeDrawing).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.edgeScrollEnabled).toBe(false);
	});

	describe("staged deselection of a text slot", () => {
		it("drops only the slot on the first press, keeping the object selected", () => {
			const next = EscapeSelectionCommand.execute(
				slotSelectedState(),
				registries,
			);
			expect(next.selectedTextSlot).toBeNull();
			expect(next.selectedIds).toEqual(["rec-1"]);
		});

		it("clears the object selection on the next press", () => {
			const afterFirst = EscapeSelectionCommand.execute(
				slotSelectedState(),
				registries,
			);
			const next = EscapeSelectionCommand.execute(afterFirst, registries);
			expect(next.selectedIds).toEqual([]);
		});

		it("closes an open ObjectMenu submenu on the step out of the slot", () => {
			const state = { ...slotSelectedState(), objectMenuOpenId: "alignment" };
			const next = EscapeSelectionCommand.execute(state, registries);
			expect(next.objectMenuOpenId).toBeNull();
		});

		it("clears everything at once when the slot selection is stale", () => {
			// The object it names is no longer the selection, so there is no level to step out of.
			const state = baseState({
				selectedIds: ["other"],
				selectedTextSlot: { objectId: "rec-1", slotId: "rows" },
			});
			const next = EscapeSelectionCommand.execute(state, registries);
			expect(next.selectedIds).toEqual([]);
			expect(next.selectedTextSlot).toBeNull();
		});
	});

	it("closes an open StencilLibrary category flyout", () => {
		const state = baseState({ stencilLibraryOpenCategory: "flowchart" });
		expect(
			EscapeSelectionCommand.execute(state, registries)
				.stencilLibraryOpenCategory,
		).toBeNull();
	});

	describe("canExecute", () => {
		it("is executable when there is an object selection", () => {
			expect(
				EscapeSelectionCommand.canExecute(
					baseState({ selectedIds: ["a"] }),
					registries,
				),
			).toBe(true);
		});

		it("is executable when a text slot is selected", () => {
			expect(
				EscapeSelectionCommand.canExecute(slotSelectedState(), registries),
			).toBe(true);
		});

		it("is not executable when nothing is selected", () => {
			expect(EscapeSelectionCommand.canExecute(baseState({}), registries)).toBe(
				false,
			);
		});

		it("is not executable during an object drag (other than area selection)", () => {
			const state = baseState({
				selectedIds: ["a"],
				eventStartSnapshot: { foo: 1 } as never,
				areaSelection: null,
			});
			expect(EscapeSelectionCommand.canExecute(state, registries)).toBe(false);
		});

		it("is executable during an area-selection drag", () => {
			const state = baseState({
				eventStartSnapshot: { foo: 1 } as never,
				areaSelection: { x: 0, y: 0 } as never,
			});
			expect(EscapeSelectionCommand.canExecute(state, registries)).toBe(true);
		});
	});
});
