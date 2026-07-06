import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { initializeCommands } from "../../../setup/initializeCommands";
import { initializeGestureHandlerRegistry } from "../../../setup/initializeGestureHandlerRegistry";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";
import { handleGesture } from "../handleGesture";

beforeAll(() => {
	initializeObjectRegistry();
	initializeGestureHandlerRegistry();
	initializeCommands();
});

const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

const baseState = (): CanvasControllerState =>
	createInitialControllerState(emptyDoc);

const CLICK_CLIENT_POS = { x: 200, y: 150 };

const clickOn = (
	button: number,
	targetKind: string,
	targetId: string,
	targetPart?: string,
): Gesture =>
	({
		type: "click",
		button,
		targetKind,
		targetId,
		targetPart,
		last: { x: 50, y: 50 },
		clientLast: CLICK_CLIENT_POS,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

/**
 * Right-clicks over menu surfaces must not execute commands or place shapes
 * (issue #110). Menu handlers reject non-left buttons in supports(), so the
 * event falls through to CanvasEventHandler's right-button behavior
 * (context menu opens at the click position).
 */
describe("handleGesture - right-click over menus does not execute commands (#110)", () => {
	describe("toolbar", () => {
		it("executes the command on left-click (positive control)", () => {
			const state = baseState();
			const nextState = handleGesture(
				state,
				clickOn(0, "menu", "toolbar", "command:zoomIn"),
			);
			expect(nextState.viewport.zoom).not.toBe(state.viewport.zoom);
		});

		it("does not execute the command on right-click and opens the context menu instead", () => {
			const state = baseState();
			const nextState = handleGesture(
				state,
				clickOn(2, "menu", "toolbar", "command:zoomIn"),
			);
			expect(nextState.viewport.zoom).toBe(state.viewport.zoom);
			expect(nextState.contextMenuPosition).toEqual({
				clientX: CLICK_CLIENT_POS.x,
				clientY: CLICK_CLIENT_POS.y,
			});
		});
	});

	describe("shape library", () => {
		it("places a shape on left-click (positive control)", () => {
			const state = baseState();
			const nextState = handleGesture(
				state,
				clickOn(0, "menu", "shape-library", "item:sticky"),
			);
			expect(nextState.rootIds.length).toBe(state.rootIds.length + 1);
		});

		it("does not place a shape on right-click", () => {
			const state = baseState();
			const nextState = handleGesture(
				state,
				clickOn(2, "menu", "shape-library", "item:sticky"),
			);
			expect(nextState.rootIds).toEqual(state.rootIds);
			expect(nextState.objects).toEqual(state.objects);
		});

		it("does not toggle drawing mode on right-click", () => {
			const nextState = handleGesture(
				baseState(),
				clickOn(2, "menu", "shape-library", "item:rect"),
			);
			expect(nextState.shapeDrawing).toBeNull();
		});
	});

	describe("context menu", () => {
		const openMenuState = (): CanvasControllerState => {
			const base = baseState();
			const rect = { id: "a", type: "rect" } as unknown as ObjectState;
			return {
				...base,
				objects: { ...base.objects, a: rect },
				rootIds: [...base.rootIds, "a"],
				contextMenuPosition: { clientX: 100, clientY: 100 },
			};
		};

		it("executes the command on left-click (positive control)", () => {
			const nextState = handleGesture(
				openMenuState(),
				clickOn(0, "menu", "context-menu", "command:selectAll"),
			);
			expect(nextState.selectedIds).toEqual(["a"]);
		});

		it("does not execute the command on right-click", () => {
			const nextState = handleGesture(
				openMenuState(),
				clickOn(2, "menu", "context-menu", "command:selectAll"),
			);
			expect(nextState.selectedIds).toEqual([]);
			// Falls through to the canvas right-button behavior: the context menu
			// re-opens at the new click position instead of executing the item.
			expect(nextState.contextMenuPosition).toEqual({
				clientX: CLICK_CLIENT_POS.x,
				clientY: CLICK_CLIENT_POS.y,
			});
		});
	});

	describe("object menu", () => {
		it("toggles a section on left-click (positive control)", () => {
			const nextState = handleGesture(
				baseState(),
				clickOn(0, "menu", "object-menu", "toggle:style"),
			);
			expect(nextState.objectMenuOpenId).toBe("style");
		});

		it("does not toggle a section on right-click", () => {
			const nextState = handleGesture(
				baseState(),
				clickOn(2, "menu", "object-menu", "toggle:style"),
			);
			expect(nextState.objectMenuOpenId).toBeNull();
		});
	});
});
