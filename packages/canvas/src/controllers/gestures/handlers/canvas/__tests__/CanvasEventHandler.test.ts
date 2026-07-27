import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { CanvasEventHandler } from "../CanvasEventHandler";

const registries = createTestRegistries();

const makeTextRect = (id: string, text: string): ObjectState =>
	({ id, type: "rect", text: { body: { text } } }) as unknown as ObjectState;

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { a: makeTextRect("a", "old text") },
		rootIds: ["a"],
		selectedIds: ["a"],
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: null,
		shapeDrawing: null,
		areaSelection: null,
		contextMenuPosition: null,
		objectMenuOpenId: null,
		textEditState: {
			kind: "shape",
			objectId: "a",
			slotId: "body",
			text: "edited text",
		},
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		commitVersion: 0,
		...overrides,
	}) as unknown as CanvasControllerState;

const makeEvent = (overrides: Record<string, unknown>): CanvasEvent =>
	({
		targetKind: "canvas",
		targetId: "canvas",
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
		...overrides,
	}) as unknown as CanvasEvent;

describe("CanvasEventHandler", () => {
	describe("scroll / zoom while editing text", () => {
		it("scroll updates only the viewport without interrupting text editing", () => {
			const state = makeState();
			const event = makeEvent({
				type: "scroll",
				scrollDelta: { deltaX: 10, deltaY: 20 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(nextState.textEditState).toEqual({
				kind: "shape",
				objectId: "a",
				slotId: "body",
				text: "edited text",
			});
			expect(nextState.viewport.minX).toBe(10);
			expect(nextState.viewport.minY).toBe(20);
		});

		it("scroll updates the viewport with a delta scaled by the zoom level", () => {
			const state = makeState({
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 2 },
			} as Partial<CanvasControllerState>);
			const event = makeEvent({
				type: "scroll",
				scrollDelta: { deltaX: 10, deltaY: 20 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(nextState.viewport.minX).toBe(5);
			expect(nextState.viewport.minY).toBe(10);
		});

		it("zoom updates only the zoom level without interrupting text editing", () => {
			const state = makeState();
			const event = makeEvent({
				type: "zoom",
				zoomDelta: -100,
				last: { x: 0, y: 0 },
			});

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(nextState.textEditState).toEqual({
				kind: "shape",
				objectId: "a",
				slotId: "body",
				text: "edited text",
			});
			expect(nextState.viewport.zoom).toBeCloseTo(1.1);
		});
	});

	describe("click while editing text", () => {
		it("pressed commits the text and ends editing", () => {
			const state = makeState();
			const event = makeEvent({ type: "pressed", button: 0 });

			const nextState = CanvasEventHandler.handle(state, event, registries);

			expect(nextState.textEditState).toBeNull();
			expect(
				(
					nextState.objects["a"] as ObjectState & {
						text: { body: { text: string } };
					}
				).text.body.text,
			).toBe("edited text");
			expect(nextState.selectedIds).toEqual([]);
		});
	});

	describe("area selection (marquee)", () => {
		const bboxes = {
			a: { left: 10, right: 20, top: 10, bottom: 20 },
			b: { left: 30, right: 40, top: 30, bottom: 40 },
		};
		const makeMarqueeState = (
			overrides: Partial<CanvasControllerState> = {},
		): CanvasControllerState =>
			makeState({
				objects: {
					a: makeTextRect("a", ""),
					b: makeTextRect("b", ""),
				},
				rootIds: ["a", "b"],
				selectedIds: [],
				textEditState: null,
				eventStartSnapshot: { bboxes },
				...overrides,
			} as Partial<CanvasControllerState>);

		it("dragStart initializes hitIds to empty and clears multiSelectGroup", () => {
			const state = makeMarqueeState({
				multiSelectGroup: { id: "stale" },
			} as Partial<CanvasControllerState>);
			const nextState = CanvasEventHandler.handle(
				state,
				makeEvent({
					type: "dragStart",
					start: { x: 0, y: 0 },
					last: { x: 0, y: 0 },
				}),
				registries,
			);
			expect(nextState.areaSelection).toEqual({
				startX: 0,
				startY: 0,
				endX: 0,
				endY: 0,
				hitIds: [],
			});
			expect(nextState.multiSelectGroup).toBeNull();
		});

		it("a changed hit set recomputes the selection and stores the new hitIds", () => {
			const state = makeMarqueeState({
				areaSelection: { startX: 0, startY: 0, endX: 5, endY: 5, hitIds: [] },
			} as Partial<CanvasControllerState>);
			const nextState = CanvasEventHandler.handle(
				state,
				makeEvent({ type: "drag", last: { x: 50, y: 50 } }),
				registries,
			);
			expect(nextState.selectedIds).toEqual(["a", "b"]);
			expect(nextState.multiSelectGroup).not.toBeNull();
			expect(nextState.areaSelection?.hitIds).toEqual(["a", "b"]);
		});

		it("an identical hit set early-outs, keeping selectedIds / multiSelectGroup by reference", () => {
			const state = makeMarqueeState({
				areaSelection: { startX: 0, startY: 0, endX: 5, endY: 5, hitIds: [] },
			} as Partial<CanvasControllerState>);
			const firstFrame = CanvasEventHandler.handle(
				state,
				makeEvent({ type: "drag", last: { x: 50, y: 50 } }),
				registries,
			);
			const secondFrame = CanvasEventHandler.handle(
				firstFrame,
				makeEvent({ type: "drag", last: { x: 55, y: 55 } }),
				registries,
			);
			expect(secondFrame.selectedIds).toBe(firstFrame.selectedIds);
			expect(secondFrame.multiSelectGroup).toBe(firstFrame.multiSelectGroup);
			expect(secondFrame.areaSelection?.hitIds).toBe(
				firstFrame.areaSelection?.hitIds,
			);
			expect(secondFrame.areaSelection?.endX).toBe(55);
			expect(secondFrame.areaSelection?.endY).toBe(55);
		});
	});

	it("a background press closes an open StencilLibrary category flyout", () => {
		const state = makeState({
			textEditState: null,
			stencilLibraryOpenCategory: "flowchart",
		} as Partial<CanvasControllerState>);
		const nextState = CanvasEventHandler.handle(
			state,
			makeEvent({ type: "pressed", button: 0 }),
			registries,
		);
		expect(nextState.stencilLibraryOpenCategory).toBeNull();
	});
});
