import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../setup/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ToolbarHandler } from "../ToolbarHandler";

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
		contextMenuPosition: { x: 1, y: 1 },
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick",
	targetId: string,
	targetPart?: string,
	targetKind = "menu",
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		targetPart,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

describe("ToolbarHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=toolbar)", () => {
			expect(
				ToolbarHandler.supports(
					makeEvent("click", "toolbar", "command:zoomIn"),
				),
			).toBe(true);
			expect(
				ToolbarHandler.supports(
					makeEvent("click", "object-menu", "command:zoomIn"),
				),
			).toBe(false);
			expect(
				ToolbarHandler.supports(
					makeEvent("click", "toolbar", "command:zoomIn", "control"),
				),
			).toBe(false);
		});
	});

	it("a click on a command button executes the command", () => {
		const next = ToolbarHandler.handle(
			makeState(),
			makeEvent("click", "toolbar", "command:zoomIn"),
			registries,
		);
		expect(next.viewport.zoom).toBeGreaterThan(1);
	});

	it("a doubleClick also executes (rapid tapping = execute every time)", () => {
		// The recognizer turns the second rapid tap on the same button into a
		// doubleClick; repeat commands have no double-click-specific meaning,
		// so the handler must treat both events equivalently.
		const next = ToolbarHandler.handle(
			makeState(),
			makeEvent("doubleClick", "toolbar", "command:zoomIn"),
			registries,
		);
		expect(next.viewport.zoom).toBeGreaterThan(1);
	});

	it("a pressed closes the context menu without executing", () => {
		const next = ToolbarHandler.handle(
			makeState(),
			makeEvent("pressed", "toolbar", "command:zoomIn"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.viewport.zoom).toBe(1);
	});
});
