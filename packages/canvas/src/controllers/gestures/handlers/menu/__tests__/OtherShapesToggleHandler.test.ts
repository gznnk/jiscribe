import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import { StartTextEditCommand } from "../../../../commands/text/StartTextEditCommand";
import { createTestState } from "../../../../reducer/__tests__/support/createTestState";
import { twoRectsDoc } from "../../../../reducer/__tests__/support/fixtures";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { OtherShapesToggleHandler } from "../OtherShapesToggleHandler";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		selection: selectionOf(["a"]),
		contextMenuPosition: { x: 1, y: 1 },
		stencilLibraryOpenCategory: "flowchart",
		isOtherShapesPopoverOpen: false,
		...overrides,
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick" | "dragStart",
	targetId = "other-shapes-button",
	targetKind = "menu",
): CanvasEvent =>
	({
		type,
		targetKind,
		targetId,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

describe("OtherShapesToggleHandler", () => {
	it("accepts only (kind=menu, id=other-shapes-button)", () => {
		expect(OtherShapesToggleHandler.supports(makeEvent("click"))).toBe(true);
		expect(
			OtherShapesToggleHandler.supports(makeEvent("click", "stencil-bar")),
		).toBe(false);
		expect(
			OtherShapesToggleHandler.supports(
				makeEvent("click", "other-shapes-button", "control"),
			),
		).toBe(false);
	});

	it.each(["click", "doubleClick"] as const)(
		"a %s opens the popover, and the next one closes it",
		(type) => {
			const opened = OtherShapesToggleHandler.handle(
				makeState(),
				makeEvent(type),
				registries,
			);
			expect(opened.isOtherShapesPopoverOpen).toBe(true);
			const closed = OtherShapesToggleHandler.handle(
				opened,
				makeEvent(type),
				registries,
			);
			expect(closed.isOtherShapesPopoverOpen).toBe(false);
		},
	);

	/** Otherwise the click after it would only reopen what the press closed. */
	it("a press closes the context menu and the category flyout, and leaves the popover open", () => {
		const next = OtherShapesToggleHandler.handle(
			makeState({ isOtherShapesPopoverOpen: true }),
			makeEvent("pressed"),
			registries,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
		expect(next.isOtherShapesPopoverOpen).toBe(true);
		expect(next.selection.objectIds).toEqual(["a"]);
	});

	/** The popover never shows beside an editor, which would lose Escape to it. */
	it("opening commits an open text edit first", () => {
		const editing = StartTextEditCommand.execute(
			createTestState(twoRectsDoc, { selection: selectionOf(["rect-1"]) }),
			registries,
		);
		expect(editing.mode.kind).toBe("textEdit");
		const opened = OtherShapesToggleHandler.handle(
			editing,
			makeEvent("click"),
			registries,
		);
		expect(opened.isOtherShapesPopoverOpen).toBe(true);
		expect(opened.mode.kind).toBe("normal");
	});

	it("a drag off the button changes nothing", () => {
		const state = makeState();
		expect(
			OtherShapesToggleHandler.handle(
				state,
				makeEvent("dragStart"),
				registries,
			),
		).toBe(state);
	});
});
