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
		stencilLibraryCategoryIds: ["flowchart", "general"],
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

	/**
	 * Drawn as the catalog, the unknown category is not what this button stands
	 * for, so the press shows the button's own category in place.
	 */
	it("while docked on a category the library lacks, a click shows its own category", () => {
		const next = toggle(
			makeState(null, { isOpen: true, content: category("no-such-category") }),
			"flowchart",
		);
		expect(next.stencilLibraryPanel).toEqual({
			isOpen: true,
			content: category("flowchart"),
		});
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

	describe("dragging a pin to another place", () => {
		type DragEventType = "dragStart" | "drag" | "dragEnd";
		/** A drag event whose pointer is over the category `hoveredCategoryId`, or over nothing. */
		const dragEvent = (
			type: DragEventType,
			categoryId: string,
			hoveredCategoryId: string | null = null,
		): CanvasEvent =>
			({
				...makeEvent("click", "stencil-category", `toggle:${categoryId}`),
				type,
				getHovered: () =>
					hoveredCategoryId === null
						? []
						: [
								{
									kind: "menu",
									id: "stencil-category",
									action: `toggle:${hoveredCategoryId}`,
								},
							],
			}) as unknown as CanvasEvent;
		const handle = (state: CanvasControllerState, event: CanvasEvent) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			StencilCategoryToggleHandler.handle(state, event, {} as any);
		/** A state mid-drag, as handleGesture opens one ("inert") before routing. */
		const draggingState = (pinnedCategoryIds: string[]) =>
			({
				...makeState(),
				pinnedCategoryIds,
				drag: {
					kind: "menu",
					startSnapshot: {},
					snapFeedback: null,
					axisLockFeedback: null,
					edgeScrollEnabled: false,
				},
			}) as unknown as CanvasControllerState;

		it("claims a pinReorder drag for a pinned category, and nothing for another", () => {
			const started = handle(
				draggingState(["flowchart", "general"]),
				dragEvent("dragStart", "general"),
			);
			expect(started.drag).toMatchObject({
				kind: "pinReorder",
				categoryId: "general",
				insertionIndex: null,
			});
			const unpinned = handle(
				draggingState(["flowchart"]),
				dragEvent("dragStart", "general"),
			);
			expect(unpinned.drag?.kind).toBe("menu");
		});

		it("follows the pinned category under the pointer, keeping the index over anything else", () => {
			let state = handle(
				draggingState(["flowchart", "general", "uml"]),
				dragEvent("dragStart", "uml"),
			);
			state = handle(state, dragEvent("drag", "uml", "flowchart"));
			expect(state.drag).toMatchObject({ insertionIndex: 0 });
			const overGap = handle(state, dragEvent("drag", "uml", null));
			expect(overGap).toBe(state);
			const overUnpinned = handle(state, dragEvent("drag", "uml", "er"));
			expect(overUnpinned).toBe(state);
			state = handle(state, dragEvent("drag", "uml", "uml"));
			expect(state.drag).toMatchObject({ insertionIndex: null });
		});

		it("moves the pin on dragEnd, and leaves the order alone with no index", () => {
			let state = handle(
				draggingState(["flowchart", "general", "uml"]),
				dragEvent("dragStart", "uml"),
			);
			const unmoved = handle(state, dragEvent("dragEnd", "uml"));
			expect(unmoved.pinnedCategoryIds).toEqual([
				"flowchart",
				"general",
				"uml",
			]);
			state = handle(state, dragEvent("drag", "uml", "general"));
			const dropped = handle(state, dragEvent("dragEnd", "uml"));
			expect(dropped.pinnedCategoryIds).toEqual([
				"flowchart",
				"uml",
				"general",
			]);
			// A drag opens no panel.
			expect(dropped.stencilFlyout).toBeNull();
		});
	});
});
