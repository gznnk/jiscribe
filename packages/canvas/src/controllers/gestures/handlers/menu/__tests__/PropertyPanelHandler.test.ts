import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { PropertyPanelHandler } from "../PropertyPanelHandler";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		propertyPanel: { isOpen: true, collapsedSectionIds: [] },
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

describe("PropertyPanelHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=property-panel)", () => {
			expect(
				PropertyPanelHandler.supports(
					makeEvent("click", "property-panel", "command:togglePropertyPanel"),
				),
			).toBe(true);
			expect(
				PropertyPanelHandler.supports(
					makeEvent("click", "stencil-library-panel", "close"),
				),
			).toBe(false);
			expect(
				PropertyPanelHandler.supports(
					makeEvent(
						"click",
						"property-panel",
						"command:togglePropertyPanel",
						"control",
					),
				),
			).toBe(false);
		});
	});

	it("a click on the close button closes the panel", () => {
		const next = PropertyPanelHandler.handle(
			makeState(),
			makeEvent("click", "property-panel", "command:togglePropertyPanel"),
			registries,
		);
		expect(next.propertyPanel.isOpen).toBe(false);
	});

	it("a press dismisses the context menu and the category flyout", () => {
		const next = PropertyPanelHandler.handle(
			makeState(),
			makeEvent("pressed", "property-panel"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
		// The panel is persistent chrome, so a press on it leaves it open
		expect(next.propertyPanel.isOpen).toBe(true);
		expect(next.selectedIds).toEqual(["a"]);
	});

	it("a click on the panel's own background changes nothing", () => {
		const state = makeState();
		const next = PropertyPanelHandler.handle(
			state,
			makeEvent("click", "property-panel"),
			registries,
		);
		expect(next).toBe(state);
	});

	it("ignores a part that is not a command", () => {
		const state = makeState();
		const next = PropertyPanelHandler.handle(
			state,
			makeEvent("click", "property-panel", "section:style"),
			registries,
		);
		expect(next).toBe(state);
	});
});
