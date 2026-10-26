import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { StencilRailHandler } from "../StencilRailHandler";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: {},
		rootIds: [],
		selection: selectionOf(["a"]),
		multiSelectGroup: null,
		mode: { kind: "normal" },
		contextMenuPosition: { x: 1, y: 1 },
		objectMenuOpenId: "bg-color",
		stencilFlyout: { kind: "category", categoryId: "flowchart" },
		stencilLibraryPanel: { isOpen: false, content: { kind: "catalog" } },
		stencilLibraryCategoryIds: ["flowchart"],
		...overrides,
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

const CATALOG_ACTION = "command:toggleStencilLibrary";

describe("StencilRailHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=stencil-rail)", () => {
			expect(
				StencilRailHandler.supports(
					makeEvent("click", "stencil-rail", CATALOG_ACTION),
				),
			).toBe(true);
			// The rail's presets and category buttons keep their own targets.
			expect(
				StencilRailHandler.supports(
					makeEvent("click", "stencil-library", "item:rect"),
				),
			).toBe(false);
			expect(
				StencilRailHandler.supports(
					makeEvent("click", "stencil-category", "toggle:flowchart"),
				),
			).toBe(false);
			expect(
				StencilRailHandler.supports(
					makeEvent("click", "stencil-rail", CATALOG_ACTION, "control"),
				),
			).toBe(false);
		});
	});

	it("a press on the empty rail dismisses the flyout and the context menu, nothing else", () => {
		const next = StencilRailHandler.handle(
			makeState(),
			makeEvent("pressed", "stencil-rail"),
			registries,
		);
		expect(next.stencilFlyout).toBeNull();
		expect(next.contextMenuPosition).toBeNull();
		// Chrome, not the canvas: the selection and its open submenu stay.
		expect(next.selection.objectIds).toEqual(["a"]);
		expect(next.objectMenuOpenId).toBe("bg-color");
	});

	/**
	 * Closing the flyout on the press would have the catalog button's click open
	 * it again, so the button the user pressed would never close it.
	 */
	it("a press on the catalog button leaves the flyout to the click", () => {
		const next = StencilRailHandler.handle(
			makeState({ stencilFlyout: { kind: "catalog" } }),
			makeEvent("pressed", "stencil-rail", CATALOG_ACTION),
			registries,
		);
		expect(next.stencilFlyout).toEqual({ kind: "catalog" });
		expect(next.contextMenuPosition).toBeNull();
	});

	it("a click on the catalog button runs toggleStencilLibrary", () => {
		const next = StencilRailHandler.handle(
			makeState({ stencilFlyout: null }),
			makeEvent("click", "stencil-rail", CATALOG_ACTION),
			registries,
		);
		expect(next.stencilFlyout).toEqual({ kind: "catalog" });
	});

	it("a doubleClick runs it too (rapid tapping = execute every time)", () => {
		const next = StencilRailHandler.handle(
			makeState({ stencilFlyout: { kind: "catalog" } }),
			makeEvent("doubleClick", "stencil-rail", CATALOG_ACTION),
			registries,
		);
		expect(next.stencilFlyout).toBeNull();
	});

	describe("the rail's popovers", () => {
		it("a click on '…' opens its popover in the flyout's slot, replacing a category", () => {
			const next = StencilRailHandler.handle(
				makeState(),
				makeEvent("click", "stencil-rail", "toggle:railOverflow"),
				registries,
			);
			expect(next.stencilFlyout).toEqual({ kind: "railOverflow" });
		});

		it("a click on the open popover's button closes it; on the other one, switches", () => {
			const closed = StencilRailHandler.handle(
				makeState({ stencilFlyout: { kind: "railOverflow" } }),
				makeEvent("doubleClick", "stencil-rail", "toggle:railOverflow"),
				registries,
			);
			expect(closed.stencilFlyout).toBeNull();
			const switched = StencilRailHandler.handle(
				makeState({ stencilFlyout: { kind: "railOverflow" } }),
				makeEvent("click", "stencil-rail", "toggle:railPresets"),
				registries,
			);
			expect(switched.stencilFlyout).toEqual({ kind: "railPresets" });
		});

		it("opens over a docked panel, leaving it docked", () => {
			const dockedPanel = {
				isOpen: true,
				content: { kind: "category", categoryId: "flowchart" },
			} as const;
			const next = StencilRailHandler.handle(
				makeState({ stencilFlyout: null, stencilLibraryPanel: dockedPanel }),
				makeEvent("click", "stencil-rail", "toggle:railOverflow"),
				registries,
			);
			expect(next.stencilFlyout).toEqual({ kind: "railOverflow" });
			expect(next.stencilLibraryPanel).toBe(dockedPanel);
		});

		it("a press on a popover's background keeps it open and closes the context menu", () => {
			const popoverPress = makeEvent("pressed", "stencil-rail-popover");
			expect(StencilRailHandler.supports(popoverPress)).toBe(true);
			const next = StencilRailHandler.handle(
				makeState({ stencilFlyout: { kind: "railOverflow" } }),
				popoverPress,
				registries,
			);
			expect(next.stencilFlyout).toEqual({ kind: "railOverflow" });
			expect(next.contextMenuPosition).toBeNull();
		});

		it("a toggle naming no popover changes nothing", () => {
			const state = makeState();
			const next = StencilRailHandler.handle(
				state,
				makeEvent("click", "stencil-rail", "toggle:flowchart"),
				registries,
			);
			expect(next.stencilFlyout).toBe(state.stencilFlyout);
		});
	});
});
