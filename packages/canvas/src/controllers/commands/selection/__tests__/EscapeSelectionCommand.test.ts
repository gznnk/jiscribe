import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../selection/__tests__/support/vertexPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../selection/textSlotPartKind";
import { EscapeSelectionCommand } from "../EscapeSelectionCommand";

const registries = createTestRegistries();

const baseState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		objects: {},
		selection: selectionOf([]),
		multiSelectGroup: null,
		areaSelection: null,
		shapeDrawing: null,
		activeDrag: null,
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
		selection: selectionOf(["rec-1"], {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "rows", focusId: "rows" }],
		}),
	});

describe("EscapeSelectionCommand", () => {
	it("clears all selection and editing state when nothing is part-selected", () => {
		const state = baseState({
			selection: selectionOf(["a", "b"]),
			multiSelectGroup: { id: "ms" } as never,
			areaSelection: { x: 0, y: 0 } as never,
			shapeDrawing: { type: "rect" } as never,
			objectMenuOpenId: "a",
			edgeScrollEnabled: true,
		});
		const next = EscapeSelectionCommand.execute(state, registries);
		expect(next.selection.objectIds).toEqual([]);
		expect(next.selection.part).toBeNull();
		expect(next.multiSelectGroup).toBeNull();
		expect(next.areaSelection).toBeNull();
		expect(next.shapeDrawing).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.edgeScrollEnabled).toBe(false);
	});

	it("drops only a picked vertex on the first press, keeping the object selected", () => {
		const state = baseState({
			objects: {
				p1: { id: "p1", type: "polyline", points: [] },
			} as never,
			selection: selectionOf(["p1"], vertexPartSelection(0)),
		});
		const next = EscapeSelectionCommand.execute(state, registries);
		expect(next.selection.part).toBeNull();
		expect(next.selection.objectIds).toEqual(["p1"]);
	});

	describe("staged deselection of a text slot", () => {
		it("drops only the slot on the first press, keeping the object selected", () => {
			const next = EscapeSelectionCommand.execute(
				slotSelectedState(),
				registries,
			);
			expect(next.selection.part).toBeNull();
			expect(next.selection.objectIds).toEqual(["rec-1"]);
		});

		it("clears the object selection on the next press", () => {
			const afterFirst = EscapeSelectionCommand.execute(
				slotSelectedState(),
				registries,
			);
			const next = EscapeSelectionCommand.execute(afterFirst, registries);
			expect(next.selection.objectIds).toEqual([]);
		});

		it("closes an open ObjectMenu submenu on the step out of the slot", () => {
			const state = { ...slotSelectedState(), objectMenuOpenId: "alignment" };
			const next = EscapeSelectionCommand.execute(state, registries);
			expect(next.objectMenuOpenId).toBeNull();
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
					baseState({ selection: selectionOf(["a"]) }),
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
				selection: selectionOf(["a"]),
				activeDrag: { startSnapshot: { foo: 1 }, kind: "other" } as never,
				areaSelection: null,
			});
			expect(EscapeSelectionCommand.canExecute(state, registries)).toBe(false);
		});

		it("is executable during an area-selection drag", () => {
			const state = baseState({
				activeDrag: { startSnapshot: { foo: 1 }, kind: "other" } as never,
				areaSelection: { x: 0, y: 0 } as never,
			});
			expect(EscapeSelectionCommand.canExecute(state, registries)).toBe(true);
		});
	});
});
