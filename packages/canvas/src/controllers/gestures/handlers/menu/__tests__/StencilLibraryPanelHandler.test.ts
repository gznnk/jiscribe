import { describe, expect, it } from "vitest";

import type {
	CanvasControllerState,
	StencilPanelContent,
} from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { StencilLibraryPanelHandler } from "../StencilLibraryPanelHandler";

const registries = createTestRegistries();

const FLOWCHART: StencilPanelContent = {
	kind: "category",
	categoryId: "flowchart",
};

/** The flyout open on the flowchart category, nothing docked. */
const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		stencilLibraryPanel: { isOpen: false, content: { kind: "catalog" } },
		stencilFlyout: FLOWCHART,
		pinnedCategoryIds: [],
		selection: selectionOf(["a"]),
		contextMenuPosition: { x: 1, y: 1 },
		...overrides,
	}) as unknown as CanvasControllerState;

/** The docked panel open on `content`, no flyout (the two never coexist). */
const makeDockedState = (
	content: StencilPanelContent,
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	makeState({
		stencilFlyout: null,
		stencilLibraryPanel: { isOpen: true, content },
		...overrides,
	});

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

const click = (state: CanvasControllerState, action: string) =>
	StencilLibraryPanelHandler.handle(
		state,
		makeEvent("click", "stencil-library-panel", action),
		registries,
	);

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

	describe("dock / undock", () => {
		it("docking turns the flyout into the docked panel, showing the same content", () => {
			const next = click(makeState(), "dock");
			expect(next.stencilFlyout).toBeNull();
			expect(next.stencilLibraryPanel).toEqual({
				isOpen: true,
				content: FLOWCHART,
			});
		});

		it("docking with no flyout open changes nothing", () => {
			const state = makeDockedState(FLOWCHART);
			expect(click(state, "dock")).toEqual(state);
		});

		it("undocking turns the docked panel back into the flyout", () => {
			const next = click(makeDockedState({ kind: "catalog" }), "undock");
			expect(next.stencilFlyout).toEqual({ kind: "catalog" });
			expect(next.stencilLibraryPanel.isOpen).toBe(false);
		});

		it("undocking with nothing docked changes nothing", () => {
			const state = makeState();
			expect(click(state, "undock")).toEqual(state);
		});
	});

	describe("close", () => {
		it("closes the flyout", () => {
			const next = click(makeState(), "close");
			expect(next.stencilFlyout).toBeNull();
			expect(next.stencilLibraryPanel.isOpen).toBe(false);
		});

		it("closes the docked panel, keeping what it showed for the next dock", () => {
			const next = click(makeDockedState(FLOWCHART), "close");
			expect(next.stencilFlyout).toBeNull();
			expect(next.stencilLibraryPanel).toEqual({
				isOpen: false,
				content: FLOWCHART,
			});
		});
	});

	describe("show (a catalog row)", () => {
		it("switches the flyout to the category", () => {
			const next = click(
				makeState({ stencilFlyout: { kind: "catalog" } }),
				"show:general",
			);
			expect(next.stencilFlyout).toEqual({
				kind: "category",
				categoryId: "general",
			});
			expect(next.stencilLibraryPanel.isOpen).toBe(false);
		});

		it("switches the docked panel to the category, keeping it docked", () => {
			const next = click(makeDockedState({ kind: "catalog" }), "show:general");
			expect(next.stencilFlyout).toBeNull();
			expect(next.stencilLibraryPanel).toEqual({
				isOpen: true,
				content: { kind: "category", categoryId: "general" },
			});
		});

		it("opens nothing when no panel is open", () => {
			const state = makeState({ stencilFlyout: null });
			expect(click(state, "show:general")).toEqual(state);
		});
	});

	describe("pin", () => {
		it("appends an unpinned category at the end of the pins", () => {
			const next = click(
				makeState({ pinnedCategoryIds: ["flowchart"] }),
				"pin:uml",
			);
			expect(next.pinnedCategoryIds).toEqual(["flowchart", "uml"]);
		});

		it("takes a pinned category off, leaving the others in order", () => {
			const next = click(
				makeState({ pinnedCategoryIds: ["flowchart", "uml", "er"] }),
				"pin:uml",
			);
			expect(next.pinnedCategoryIds).toEqual(["flowchart", "er"]);
		});

		it("leaves the panels as they are", () => {
			const state = makeState({ stencilFlyout: { kind: "catalog" } });
			const next = click(state, "pin:uml");
			expect(next.stencilFlyout).toBe(state.stencilFlyout);
			expect(next.stencilLibraryPanel).toBe(state.stencilLibraryPanel);
		});
	});

	it("a press on a button does not act, the click does", () => {
		const next = StencilLibraryPanelHandler.handle(
			makeState(),
			makeEvent("pressed", "stencil-library-panel", "close"),
			registries,
		);
		expect(next.stencilFlyout).toEqual(FLOWCHART);
	});

	it("a press on the panel dismisses the context menu and nothing else", () => {
		const next = StencilLibraryPanelHandler.handle(
			makeState(),
			makeEvent("pressed", "stencil-library-panel"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		// A press inside the flyout must not close it, and a press over chrome is
		// not a press on the canvas: the selection stays too.
		expect(next.stencilFlyout).toEqual(FLOWCHART);
		expect(next.selection.objectIds).toEqual(["a"]);
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

	it("a click with an action it does not know is inert", () => {
		const state = makeState();
		expect(click(state, "section:flowchart")).toBe(state);
	});
});
