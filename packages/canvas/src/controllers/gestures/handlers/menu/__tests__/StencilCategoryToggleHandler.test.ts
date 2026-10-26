import { describe, expect, it } from "vitest";

import type {
	CanvasControllerState,
	StencilLibraryPanelState,
	StencilPanelContent,
} from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { StencilCategoryToggleHandler } from "../StencilCategoryToggleHandler";

const category = (categoryId: string): StencilPanelContent => ({
	kind: "category",
	categoryId,
});

const CLOSED_DOCK: StencilLibraryPanelState = {
	isOpen: false,
	content: { kind: "catalog" },
};

const makeState = (
	stencilFlyout: StencilPanelContent | null = null,
	stencilLibraryPanel: StencilLibraryPanelState = CLOSED_DOCK,
): CanvasControllerState =>
	({
		stencilFlyout,
		stencilLibraryPanel,
		contextMenuPosition: { x: 1, y: 1 },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick",
	targetId: string,
	targetAction?: string,
	targetKind = "menu",
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		targetAction,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const toggle = (state: CanvasControllerState, categoryId: string) =>
	StencilCategoryToggleHandler.handle(
		state,
		makeEvent("click", "stencil-category", `toggle:${categoryId}`),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		{} as any,
	);

describe("StencilCategoryToggleHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=stencil-category)", () => {
			expect(
				StencilCategoryToggleHandler.supports(
					makeEvent("click", "stencil-category", "toggle:flowchart"),
				),
			).toBe(true);
			expect(
				StencilCategoryToggleHandler.supports(
					makeEvent("click", "stencil-library", "item:diamond"),
				),
			).toBe(false);
			expect(
				StencilCategoryToggleHandler.supports(
					makeEvent("click", "stencil-category", "toggle:flowchart", "control"),
				),
			).toBe(false);
		});
	});

	it("a click opens the category in the flyout when nothing is open", () => {
		const next = toggle(makeState(null), "flowchart");
		expect(next.stencilFlyout).toEqual(category("flowchart"));
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
	});

	it("a click on the category the flyout shows closes it (toggle)", () => {
		const next = toggle(makeState(category("flowchart")), "flowchart");
		expect(next.stencilFlyout).toBeNull();
	});

	it("a click on a different category switches the flyout to it", () => {
		const next = toggle(makeState(category("flowchart")), "general");
		expect(next.stencilFlyout).toEqual(category("general"));
	});

	it("a click switches the flyout from the catalog to the category", () => {
		const next = toggle(makeState({ kind: "catalog" }), "general");
		expect(next.stencilFlyout).toEqual(category("general"));
	});

	it("while docked, a click shows the category in the docked panel, not in a flyout", () => {
		const next = toggle(
			makeState(null, { isOpen: true, content: { kind: "catalog" } }),
			"flowchart",
		);
		expect(next.stencilFlyout).toBeNull();
		expect(next.stencilLibraryPanel).toEqual({
			isOpen: true,
			content: category("flowchart"),
		});
	});

	it("while docked, a click on the category it shows closes the docked panel", () => {
		const next = toggle(
			makeState(null, { isOpen: true, content: category("flowchart") }),
			"flowchart",
		);
		expect(next.stencilFlyout).toBeNull();
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
		// Kept for the next dock.
		expect(next.stencilLibraryPanel.content).toEqual(category("flowchart"));
	});

	it("a closed docked panel's leftover content does not count as shown", () => {
		const next = toggle(
			makeState(null, { isOpen: false, content: category("flowchart") }),
			"flowchart",
		);
		expect(next.stencilFlyout).toEqual(category("flowchart"));
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
	});

	it("a pressed closes the context menu without changing the open category", () => {
		const next = StencilCategoryToggleHandler.handle(
			makeState(category("flowchart")),
			makeEvent("pressed", "stencil-category", "toggle:flowchart"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.stencilFlyout).toEqual(category("flowchart"));
	});
});
