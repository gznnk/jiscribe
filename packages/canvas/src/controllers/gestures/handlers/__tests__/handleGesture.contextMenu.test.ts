import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { initializeGestureHandlerRegistry } from "../../../setup/initializeGestureHandlerRegistry";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";
import { handleGesture } from "../handleGesture";

beforeAll(() => {
	initializeObjectRegistry();
	initializeGestureHandlerRegistry();
});

const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

/**
 * Build a state with the context menu open.
 * Includes one shape `a` and one connector `c` so that pressed events on each target can be reproduced.
 */
const openMenuState = (): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc);
	const rect = { id: "a", type: "rect" } as unknown as ObjectState;
	const connector = { id: "c", type: "connector" } as unknown as ObjectState;
	return {
		...base,
		objects: { ...base.objects, a: rect, c: connector },
		rootIds: [...base.rootIds, "a", "c"],
		contextMenuPosition: { clientX: 100, clientY: 100 },
	};
};

const pressedOn = (
	targetKind: string,
	targetId: string,
	targetPart?: string,
): Gesture =>
	({
		type: "pressed",
		button: 0,
		targetKind,
		targetId,
		targetPart,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

describe("handleGesture - context menu auto-close", () => {
	it("closes the menu on left-click press over a shape", () => {
		const nextState = handleGesture(openMenuState(), pressedOn("object", "a"));
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("closes the menu on left-click press over a connector", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("connector", "c"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("closes the menu on left-click press over a control", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("control", "transform", "resize:topLeft"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("closes the menu on left-click press over the toolbar", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("menu", "toolbar", "command:zoomIn"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("closes the menu on left-click press over a shape library item", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("menu", "shape-library", "item:rect"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("closes the menu on left-click press over the ObjectMenu", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("menu", "object-menu", "command:group"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("does not close on press over a menu item (context-menu) so the click can go through", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("menu", "context-menu", "command:copy"),
		);
		expect(nextState.contextMenuPosition).toEqual({
			clientX: 100,
			clientY: 100,
		});
	});
});
