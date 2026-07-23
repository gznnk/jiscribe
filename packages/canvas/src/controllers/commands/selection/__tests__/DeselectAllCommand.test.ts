import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";
import { DeselectAllCommand } from "../DeselectAllCommand";

const registries = createTestRegistries();

const baseState = (
	overrides: Partial<CanvasControllerState>,
): CanvasControllerState =>
	({
		selectedIds: [],
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: null,
		areaSelection: null,
		shapeDrawing: null,
		eventStartSnapshot: null,
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
		edgeScrollEnabled: false,
		...overrides,
	}) as unknown as CanvasControllerState;

describe("DeselectAllCommand", () => {
	it("clears all selection and editing state at once", () => {
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
		const next = DeselectAllCommand.execute(state, registries);
		expect(next.selectedIds).toEqual([]);
		expect(next.selectedConnectorId).toBeNull();
		expect(next.selectedVertex).toBeNull();
		expect(next.multiSelectGroup).toBeNull();
		expect(next.areaSelection).toBeNull();
		expect(next.shapeDrawing).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.edgeScrollEnabled).toBe(false);
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
					baseState({ selectedIds: ["a"] }),
					registries,
				),
			).toBe(true);
		});

		it("is executable when there is a connector selection", () => {
			expect(
				DeselectAllCommand.canExecute(
					baseState({ selectedConnectorId: "c1" }),
					registries,
				),
			).toBe(true);
		});

		it("is executable when there is a vertex selection", () => {
			expect(
				DeselectAllCommand.canExecute(
					baseState({ selectedVertex: { objectId: "p1", vertexIndex: 0 } }),
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
				selectedIds: ["a"],
				eventStartSnapshot: { foo: 1 } as never,
				areaSelection: null,
			});
			expect(DeselectAllCommand.canExecute(state, registries)).toBe(false);
		});

		it("is executable during an area-selection drag", () => {
			const state = baseState({
				eventStartSnapshot: { foo: 1 } as never,
				areaSelection: { x: 0, y: 0 } as never,
			});
			expect(DeselectAllCommand.canExecute(state, registries)).toBe(true);
		});
	});
});
