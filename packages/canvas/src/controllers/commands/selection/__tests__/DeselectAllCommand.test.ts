import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../selection/__tests__/support/vertexPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../selection/partKinds/textSlotPartKind";
import { DeselectAllCommand } from "../DeselectAllCommand";

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

describe("DeselectAllCommand", () => {
	it("clears all selection and editing state at once", () => {
		const state = baseState({
			selection: selectionOf(["a", "b"], vertexPartSelection(0)),
			multiSelectGroup: { id: "ms" } as never,
			areaSelection: { x: 0, y: 0 } as never,
			shapeDrawing: { type: "rect" } as never,
			objectMenuOpenId: "a",
			edgeScrollEnabled: true,
		});
		const next = DeselectAllCommand.execute(state, registries);
		expect(next.selection.objectIds).toEqual([]);
		expect(next.selection.part).toBeNull();
		expect(next.multiSelectGroup).toBeNull();
		expect(next.areaSelection).toBeNull();
		expect(next.shapeDrawing).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.edgeScrollEnabled).toBe(false);
	});

	it("clears the object selection too when a text slot is selected, without an intermediate step", () => {
		// Escape steps out one level at a time (EscapeSelectionCommand); the explicit
		// deselect-all does not.
		const state = baseState({
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
		const next = DeselectAllCommand.execute(state, registries);
		expect(next.selection.part).toBeNull();
		expect(next.selection.objectIds).toEqual([]);
	});

	it("closes an open StencilLibrary category flyout", () => {
		const state = baseState({ stencilLibraryOpenCategory: "flowchart" });
		expect(
			DeselectAllCommand.execute(state, registries).stencilLibraryOpenCategory,
		).toBeNull();
	});

	describe("canExecute", () => {
		it("is executable when there is an object selection", () => {
			expect(
				DeselectAllCommand.canExecute(
					baseState({ selection: selectionOf(["a"]) }),
					registries,
				),
			).toBe(true);
		});

		it("is executable when there is a connector selection", () => {
			expect(
				DeselectAllCommand.canExecute(
					baseState({ selection: selectionOf(["c1"]) }),
					registries,
				),
			).toBe(true);
		});

		it("is executable when a vertex is picked on the selected object", () => {
			expect(
				DeselectAllCommand.canExecute(
					baseState({
						selection: selectionOf(["p1"], vertexPartSelection(0)),
					}),
					registries,
				),
			).toBe(true);
		});

		it("is not executable when nothing is selected", () => {
			expect(DeselectAllCommand.canExecute(baseState({}), registries)).toBe(
				false,
			);
		});

		it("is executable when a StencilLibrary category flyout is open (Escape closes it)", () => {
			expect(
				DeselectAllCommand.canExecute(
					baseState({ stencilLibraryOpenCategory: "flowchart" }),
					registries,
				),
			).toBe(true);
		});

		it("is not executable during an object drag (other than area selection)", () => {
			const state = baseState({
				selection: selectionOf(["a"]),
				activeDrag: { startSnapshot: { foo: 1 }, kind: "other" } as never,
				areaSelection: null,
			});
			expect(DeselectAllCommand.canExecute(state, registries)).toBe(false);
		});

		it("is executable during an area-selection drag", () => {
			const state = baseState({
				activeDrag: { startSnapshot: { foo: 1 }, kind: "other" } as never,
				areaSelection: { x: 0, y: 0 } as never,
			});
			expect(DeselectAllCommand.canExecute(state, registries)).toBe(true);
		});
	});

	it("keeps Escape out of its bindings, so it cannot shadow EscapeSelectionCommand", () => {
		// Sharing a binding is only resolvable by canExecute, and these two share
		// isSelectionClearable verbatim — so the two must not both claim Escape.
		const bindings = Object.values(DeselectAllCommand.shortcuts ?? {}).flat();
		expect(bindings.some((binding) => binding.code === "Escape")).toBe(false);
	});
});
