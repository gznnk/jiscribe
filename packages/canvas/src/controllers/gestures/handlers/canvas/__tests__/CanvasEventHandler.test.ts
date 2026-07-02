import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { CanvasEventHandler } from "../CanvasEventHandler";

const makeTextRect = (id: string, text: string): ObjectState =>
	({ id, type: "rect", text }) as unknown as ObjectState;

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
		textEditState: { objectId: "a", text: "edited text" },
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

			const nextState = CanvasEventHandler.handle(state, event);

			expect(nextState.textEditState).toEqual({
				objectId: "a",
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

			const nextState = CanvasEventHandler.handle(state, event);

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

			const nextState = CanvasEventHandler.handle(state, event);

			expect(nextState.textEditState).toEqual({
				objectId: "a",
				text: "edited text",
			});
			expect(nextState.viewport.zoom).toBeCloseTo(1.1);
		});
	});

	describe("click while editing text", () => {
		it("pressed commits the text and ends editing", () => {
			const state = makeState();
			const event = makeEvent({ type: "pressed", button: 0 });

			const nextState = CanvasEventHandler.handle(state, event);

			expect(nextState.textEditState).toBeNull();
			expect(
				(nextState.objects["a"] as ObjectState & { text: string }).text,
			).toBe("edited text");
			expect(nextState.selectedIds).toEqual([]);
		});
	});
});
