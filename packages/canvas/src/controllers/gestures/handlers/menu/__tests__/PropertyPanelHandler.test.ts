import { describe, expect, it, vi } from "vitest";

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

	describe("document parts", () => {
		it("states a view mode and raises commitVersion so the gesture records it", () => {
			const state = makeState({ commitVersion: 3 });
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("click", "property-panel", "doc:view.open:fit-width"),
				registries,
			);
			expect(next.view).toEqual({ open: "fit-width" });
			expect(next.commitVersion).toBe(4);
		});

		it("drops the setting for an empty value, and the view with it", () => {
			const state = makeState({
				commitVersion: 3,
				view: { scroll: "content" },
			});
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("doubleClick", "property-panel", "doc:view.scroll:"),
				registries,
			);
			expect(next.view).toBeUndefined();
			expect(next.commitVersion).toBe(4);
		});

		it("records nothing for the value the document already holds", () => {
			const state = makeState({ commitVersion: 3, view: { open: "fit-all" } });
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("click", "property-panel", "doc:view.open:fit-all"),
				registries,
			);
			expect(next).toBe(state);
		});

		it("ignores and warns about a value the setting does not take, and an unknown setting", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const state = makeState({ commitVersion: 3 });
			for (const part of [
				"doc:view.open:fit-height",
				"doc:view.scroll:none",
				"doc:view.padding.top:-4",
				"doc:view.padding.top:",
				"doc:view.zoom:2",
			]) {
				expect(
					PropertyPanelHandler.handle(
						state,
						makeEvent("click", "property-panel", part),
						registries,
					),
				).toBe(state);
			}
			expect(warnSpy).toHaveBeenCalledTimes(5);
			warnSpy.mockRestore();
		});

		it("writes nothing on a press, only on the click that follows", () => {
			const state = makeState({ commitVersion: 3 });
			const next = PropertyPanelHandler.handle(
				state,
				makeEvent("pressed", "property-panel", "doc:view.open:fit-all"),
				registries,
			);
			expect(next.view).toBeUndefined();
			expect(next.commitVersion).toBe(3);
		});
	});
});
