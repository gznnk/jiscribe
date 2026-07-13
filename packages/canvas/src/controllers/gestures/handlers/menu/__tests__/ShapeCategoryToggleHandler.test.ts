import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ShapeCategoryToggleHandler } from "../ShapeCategoryToggleHandler";

const makeState = (
	shapeLibraryOpenCategory: string | null = null,
): CanvasControllerState =>
	({
		shapeLibraryOpenCategory,
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

describe("ShapeCategoryToggleHandler", () => {
	describe("supports", () => {
		it("accepts only (kind=menu, id=shape-category)", () => {
			expect(
				ShapeCategoryToggleHandler.supports(
					makeEvent("click", "shape-category", "toggle:flowchart"),
				),
			).toBe(true);
			expect(
				ShapeCategoryToggleHandler.supports(
					makeEvent("click", "shape-library", "item:diamond"),
				),
			).toBe(false);
			expect(
				ShapeCategoryToggleHandler.supports(
					makeEvent("click", "shape-category", "toggle:flowchart", "control"),
				),
			).toBe(false);
		});
	});

	it("a click opens the category when none is open", () => {
		const next = ShapeCategoryToggleHandler.handle(
			makeState(null),
			makeEvent("click", "shape-category", "toggle:flowchart"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.shapeLibraryOpenCategory).toBe("flowchart");
	});

	it("a click on the already-open category closes it (toggle)", () => {
		const next = ShapeCategoryToggleHandler.handle(
			makeState("flowchart"),
			makeEvent("click", "shape-category", "toggle:flowchart"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.shapeLibraryOpenCategory).toBeNull();
	});

	it("a click on a different category switches to it", () => {
		const next = ShapeCategoryToggleHandler.handle(
			makeState("flowchart"),
			makeEvent("click", "shape-category", "toggle:general"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.shapeLibraryOpenCategory).toBe("general");
	});

	it("a pressed closes the context menu without changing the open category", () => {
		const next = ShapeCategoryToggleHandler.handle(
			makeState("flowchart"),
			makeEvent("pressed", "shape-category", "toggle:flowchart"),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{} as any,
		);
		expect(next.contextMenuPosition).toBeNull();
		expect(next.shapeLibraryOpenCategory).toBe("flowchart");
	});
});
