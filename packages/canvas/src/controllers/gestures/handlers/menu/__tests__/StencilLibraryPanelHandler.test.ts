import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { StencilLibraryPanelHandler } from "../StencilLibraryPanelHandler";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		stencilLibraryPanel: { isOpen: true, collapsedSectionIds: [] },
		stencilLibraryOpenCategory: "flowchart",
		selectedIds: ["a"],
		contextMenuPosition: { x: 1, y: 1 },
		...overrides,
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick",
	targetId: string,
	targetPart?: string,
	targetKind = "menu",
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		targetPart,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

describe("StencilLibraryPanelHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=stencil-library-panel)", () => {
			expect(
				StencilLibraryPanelHandler.supports(
					makeEvent("click", "stencil-library-panel", "close"),
				),
			).toBe(true);
			// The items inside the panel keep their own target and stay with
			// StencilLibraryItemHandler.
			expect(
				StencilLibraryPanelHandler.supports(
					makeEvent("click", "stencil-library", "item:rect"),
				),
			).toBe(false);
			expect(
				StencilLibraryPanelHandler.supports(
					makeEvent("click", "stencil-library-panel", "close", "control"),
				),
			).toBe(false);
		});
	});

	it("a click on a section header collapses it", () => {
		const next = StencilLibraryPanelHandler.handle(
			makeState(),
			makeEvent("click", "stencil-library-panel", "section:flowchart"),
			registries,
		);
		expect(next.stencilLibraryPanel.collapsedSectionIds).toEqual(["flowchart"]);
	});

	it("a click on a collapsed section header expands it again", () => {
		const next = StencilLibraryPanelHandler.handle(
			makeState({
				stencilLibraryPanel: {
					isOpen: true,
					collapsedSectionIds: ["basic", "flowchart"],
				},
			}),
			makeEvent("doubleClick", "stencil-library-panel", "section:flowchart"),
			registries,
		);
		expect(next.stencilLibraryPanel.collapsedSectionIds).toEqual(["basic"]);
	});

	it("a press on a section header does not toggle it, the click does", () => {
		const next = StencilLibraryPanelHandler.handle(
			makeState(),
			makeEvent("pressed", "stencil-library-panel", "section:flowchart"),
			registries,
		);
		expect(next.stencilLibraryPanel.collapsedSectionIds).toEqual([]);
	});

	it("a click on the close button closes the panel", () => {
		const next = StencilLibraryPanelHandler.handle(
			makeState(),
			makeEvent("click", "stencil-library-panel", "close"),
			registries,
		);
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
	});

	it("a press on the panel dismisses the context menu and the category flyout", () => {
		const next = StencilLibraryPanelHandler.handle(
			makeState(),
			makeEvent("pressed", "stencil-library-panel"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
		// The panel is persistent chrome, and a press over chrome is not a press on
		// the canvas: neither the panel nor the selection goes away with it.
		expect(next.selectedIds).toEqual(["a"]);
		expect(next.stencilLibraryPanel.isOpen).toBe(true);
		expect(next.stencilLibraryPanel.collapsedSectionIds).toEqual([]);
	});

	it("a click on the panel background changes nothing", () => {
		const state = makeState();
		const next = StencilLibraryPanelHandler.handle(
			state,
			makeEvent("click", "stencil-library-panel"),
			registries,
		);
		expect(next).toBe(state);
	});

	it("a click with a part it does not know is inert", () => {
		const state = makeState();
		const next = StencilLibraryPanelHandler.handle(
			state,
			makeEvent("click", "stencil-library-panel", "sectionish:flowchart"),
			registries,
		);
		expect(next).toBe(state);
	});
});
