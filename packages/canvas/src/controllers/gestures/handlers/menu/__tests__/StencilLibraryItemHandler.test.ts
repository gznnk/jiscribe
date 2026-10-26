import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { clickPlacedPlugin } from "../../../../__tests__/support/clickPlacedPlugin";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../../../selection/__tests__/support/textSlotPartSelection";
import { readTextEditDraft } from "../../../../utils/readTextEditDraft";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { StencilLibraryItemHandler } from "../StencilLibraryItemHandler";

// `pin` is the click-placed (non-drag-drawn) stand-in the plugin supplies.
const registries = createCanvasRegistries({ plugins: [clickPlacedPlugin] });

const bodyOf = (state: CanvasControllerState, id: string): unknown =>
	(state.objects[id] as unknown as { text?: { body?: { text?: unknown } } })
		.text?.body?.text;

const makeState = (): CanvasControllerState =>
	({
		registries,
		objects: {},
		rootIds: [],
		selection: selectionOf([]),
		multiSelectGroup: null,
		mode: { kind: "normal" },
		drag: null,
		objectMenuOpenId: null,
		contextMenuPosition: { x: 1, y: 1 },
		commitVersion: 0,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click",
	targetAction: string | undefined,
	targetKind = "menu",
	targetId = "stencil-library",
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		targetAction,
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
		expect(entered.mode).toMatchObject({
			kind: "draw",
			preset: { id: "rect" },
		});

		const left = StencilLibraryItemHandler.handle(
			entered,
			makeEvent("click", "item:rect"),
			registries,
		);
		expect(left.mode.kind).toBe("normal");
	});

	it("a click on a non-bounds-drawing shape places it at the viewport center", () => {
		const next = StencilLibraryItemHandler.handle(
			makeState(),
			makeEvent("click", "item:pin"),
			registries,
		);
		expect(next.rootIds).toHaveLength(1);
		expect(next.mode.kind).toBe("normal");
		expect(next.commitVersion).toBe(1);
	});

	it("a click that places a shape drops the multiSelectGroup of the selection it replaces", () => {
		const state = {
			...makeState(),
			selection: selectionOf(["rect-1", "rect-2"]),
			multiSelectGroup: { id: "multi-select-group" },
		} as unknown as CanvasControllerState;
		const next = StencilLibraryItemHandler.handle(
			state,
			makeEvent("click", "item:pin"),
			registries,
		);
		expect(next.selection.objectIds).toEqual([next.rootIds[0]]);
		expect(next.multiSelectGroup).toBeNull();
	});

	it("a click that places a shape commits an open text edit onto its own owner first", () => {
		const edited = {
			id: "rect-1",
			type: "rect",
			text: { body: { text: "" } },
		} as unknown as ObjectState;
		const state = {
			...makeState(),
			objects: { "rect-1": edited },
			rootIds: ["rect-1"],
			selection: selectionOf(["rect-1"], textSlotPartSelection("body")),
			mode: { kind: "textEdit", draft: { kind: "shape", text: "typed" } },
		} as CanvasControllerState;

		const next = StencilLibraryItemHandler.handle(
			state,
			makeEvent("click", "item:pin"),
			registries,
		);

		expect(bodyOf(next, "rect-1")).toBe("typed");
		expect(readTextEditDraft(next)).toBeNull();
		// The owner is the selection, so had the draft outlived the placement it
		// would have followed the selection onto the shape just placed.
		const placedId = next.rootIds[1];
		expect(next.objects[placedId]).not.toHaveProperty("text");
	});

	it("a drag off an item commits an open text edit before it clears the selection", () => {
		const edited = {
			id: "rect-1",
			type: "rect",
			text: { body: { text: "" } },
		} as unknown as ObjectState;
		const state = {
			...makeState(),
			objects: { "rect-1": edited },
			rootIds: ["rect-1"],
			selection: selectionOf(["rect-1"], textSlotPartSelection("body")),
			mode: { kind: "textEdit", draft: { kind: "shape", text: "typed" } },
		} as CanvasControllerState;

		const next = StencilLibraryItemHandler.handle(
			state,
			{
				...makeEvent("click", "item:rect"),
				type: "dragStart",
			} as CanvasEvent,
			registries,
		);

		expect(bodyOf(next, "rect-1")).toBe("typed");
		expect(readTextEditDraft(next)).toBeNull();
		expect(next.selection.objectIds).toEqual([]);
	});

	it("an unknown preset id does nothing", () => {
		const state = makeState();
		const next = StencilLibraryItemHandler.handle(
			state,
			makeEvent("click", "item:no-such-preset"),
			registries,
		);
		expect(next.rootIds).toHaveLength(0);
		expect(next.mode.kind).toBe("normal");
	});

	it("a pressed closes the context menu without placing or drawing", () => {
		const next = StencilLibraryItemHandler.handle(
			makeState(),
			makeEvent("pressed", "item:rect"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.rootIds).toHaveLength(0);
		expect(next.mode.kind).toBe("normal");
	});

	describe("closes an open StencilLibrary category flyout when the item is used", () => {
		const openState = (): CanvasControllerState =>
			({
				...makeState(),
				stencilFlyout: { kind: "category", categoryId: "flowchart" },
			}) as CanvasControllerState;

		it("on a click that enters drawing mode (rect)", () => {
			const next = StencilLibraryItemHandler.handle(
				openState(),
				makeEvent("click", "item:rect"),
				registries,
			);
			expect(next.stencilFlyout).toBeNull();
		});

		it("on a click that places a non-drawable shape", () => {
			const next = StencilLibraryItemHandler.handle(
				openState(),
				makeEvent("click", "item:pin"),
				registries,
			);
			expect(next.stencilFlyout).toBeNull();
		});

		it("on drag start", () => {
			const dragStart = {
				type: "dragStart",
				targetKind: "menu",
				targetId: "stencil-library",
				targetAction: "item:rect",
				button: 0,
				last: { x: 100, y: 100 },
				mods: { shift: false, alt: false, ctrl: false, meta: false },
			} as unknown as CanvasEvent;
			const next = StencilLibraryItemHandler.handle(
				openState(),
				dragStart,
				registries,
			);
			expect(next.stencilFlyout).toBeNull();
		});
	});
});
