import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { StencilLibraryItemHandler } from "../StencilLibraryItemHandler";

const registries = createTestRegistries();

const makeState = (): CanvasControllerState =>
	({
		registries,
		objects: {},
		rootIds: [],
		selectedIds: [],
		selectedConnectorId: null,
		multiSelectGroup: null,
		textEditState: null,
		shapeDrawing: null,
		objectMenuOpenId: null,
		contextMenuPosition: { x: 1, y: 1 },
		commitVersion: 0,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click",
	targetPart: string | undefined,
	targetKind = "menu",
	targetId = "stencil-library",
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		targetPart,
		button: 0,
		last: { x: 100, y: 100 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

describe("StencilLibraryItemHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=stencil-library)", () => {
			expect(
				StencilLibraryItemHandler.supports(makeEvent("click", "item:rect")),
			).toBe(true);
			expect(
				StencilLibraryItemHandler.supports(
					makeEvent("click", "item:rect", "menu", "object-menu"),
				),
			).toBe(false);
			expect(
				StencilLibraryItemHandler.supports(
					makeEvent("click", "item:rect", "control"),
				),
			).toBe(false);
		});
	});

	it("a click on a bounds-drawing shape (rect) enters drawing mode, and a second click leaves it", () => {
		const entered = StencilLibraryItemHandler.handle(
			makeState(),
			makeEvent("click", "item:rect"),
			registries,
		);
		expect(entered.shapeDrawing?.preset.id).toBe("rect");

		const left = StencilLibraryItemHandler.handle(
			entered,
			makeEvent("click", "item:rect"),
			registries,
		);
		expect(left.shapeDrawing).toBeNull();
	});

	it("a click on a non-bounds-drawing shape (sticky) places it at the viewport center", () => {
		const next = StencilLibraryItemHandler.handle(
			makeState(),
			makeEvent("click", "item:sticky"),
			registries,
		);
		expect(next.rootIds).toHaveLength(1);
		expect(next.shapeDrawing).toBeNull();
		expect(next.commitVersion).toBe(1);
	});

	it("an unknown preset id does nothing", () => {
		const state = makeState();
		const next = StencilLibraryItemHandler.handle(
			state,
			makeEvent("click", "item:no-such-preset"),
			registries,
		);
		expect(next.rootIds).toHaveLength(0);
		expect(next.shapeDrawing).toBeNull();
	});

	it("a pressed closes the context menu without placing or drawing", () => {
		const next = StencilLibraryItemHandler.handle(
			makeState(),
			makeEvent("pressed", "item:rect"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.rootIds).toHaveLength(0);
		expect(next.shapeDrawing).toBeNull();
	});

	describe("closes an open StencilLibrary category flyout when the item is used", () => {
		const openState = (): CanvasControllerState =>
			({
				...makeState(),
				stencilLibraryOpenCategory: "flowchart",
			}) as CanvasControllerState;

		it("on a click that enters drawing mode (rect)", () => {
			const next = StencilLibraryItemHandler.handle(
				openState(),
				makeEvent("click", "item:rect"),
				registries,
			);
			expect(next.stencilLibraryOpenCategory).toBeNull();
		});

		it("on a click that places a non-drawable shape (sticky)", () => {
			const next = StencilLibraryItemHandler.handle(
				openState(),
				makeEvent("click", "item:sticky"),
				registries,
			);
			expect(next.stencilLibraryOpenCategory).toBeNull();
		});

		it("on drag start", () => {
			const dragStart = {
				type: "dragStart",
				targetKind: "menu",
				targetId: "stencil-library",
				targetPart: "item:rect",
				button: 0,
				last: { x: 100, y: 100 },
				mods: { shift: false, alt: false, ctrl: false, meta: false },
			} as unknown as CanvasEvent;
			const next = StencilLibraryItemHandler.handle(
				openState(),
				dragStart,
				registries,
			);
			expect(next.stencilLibraryOpenCategory).toBeNull();
		});
	});
});
