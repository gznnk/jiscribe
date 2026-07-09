import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../setup/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ContextMenuHandler } from "../ContextMenuHandler";

const registries = createTestRegistries();

const makeState = (): CanvasControllerState =>
	({
		registries,
		objects: {},
		rootIds: [],
		selectedIds: [],
		contextMenuPosition: { clientX: 100, clientY: 100 },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click",
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

describe("ContextMenuHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=context-menu)", () => {
			expect(
				ContextMenuHandler.supports(
					makeEvent("click", "context-menu", "command:copy"),
				),
			).toBe(true);
			expect(
				ContextMenuHandler.supports(
					makeEvent("click", "toolbar", "command:copy"),
				),
			).toBe(false);
			expect(
				ContextMenuHandler.supports(
					makeEvent("click", "context-menu", "command:copy", "control"),
				),
			).toBe(false);
		});
	});

	it("a click on a command item closes the menu (even when the command is a no-op)", () => {
		const next = ContextMenuHandler.handle(
			makeState(),
			makeEvent("click", "context-menu", "command:unknown-command"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
	});

	it("a pressed on a menu item does not close the menu (so the click can go through)", () => {
		const state = makeState();
		const next = ContextMenuHandler.handle(
			state,
			makeEvent("pressed", "context-menu", "command:copy"),
			registries,
		);
		expect(next.contextMenuPosition).toEqual({ clientX: 100, clientY: 100 });
	});

	it("a click without a command part does nothing", () => {
		const state = makeState();
		const next = ContextMenuHandler.handle(
			state,
			makeEvent("click", "context-menu", undefined),
			registries,
		);
		expect(next).toBe(state);
	});
});
