import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { StencilCategoryToggleHandler } from "../StencilCategoryToggleHandler";

const makeState = (
	stencilLibraryOpenCategory: string | null = null,
): CanvasControllerState =>
	({
		stencilLibraryOpenCategory,
		contextMenuPosition: { x: 1, y: 1 },
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

describe("StencilCategoryToggleHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=stencil-category)", () => {
			expect(
				StencilCategoryToggleHandler.supports(
					makeEvent("click", "stencil-category", "toggle:flowchart"),
				),
			).toBe(true);
			expect(
				StencilCategoryToggleHandler.supports(
					makeEvent("click", "stencil-library", "item:diamond"),
				),
			).toBe(false);
			expect(
				StencilCategoryToggleHandler.supports(
					makeEvent("click", "stencil-category", "toggle:flowchart", "control"),
				),
			).toBe(false);
		});
	});

	it("a click opens the category when none is open", () => {
		const next = StencilCategoryToggleHandler.handle(
			makeState(null),
			makeEvent("click", "stencil-category", "toggle:flowchart"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.stencilLibraryOpenCategory).toBe("flowchart");
	});

	it("a click on the already-open category closes it (toggle)", () => {
		const next = StencilCategoryToggleHandler.handle(
			makeState("flowchart"),
			makeEvent("click", "stencil-category", "toggle:flowchart"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("a click on a different category switches to it", () => {
		const next = StencilCategoryToggleHandler.handle(
			makeState("flowchart"),
			makeEvent("click", "stencil-category", "toggle:general"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.stencilLibraryOpenCategory).toBe("general");
	});

	it("a pressed closes the context menu without changing the open category", () => {
		const next = StencilCategoryToggleHandler.handle(
			makeState("flowchart"),
			makeEvent("pressed", "stencil-category", "toggle:flowchart"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBe("flowchart");
	});
});
