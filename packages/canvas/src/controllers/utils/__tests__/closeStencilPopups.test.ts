import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import {
	closeStencilPopups,
	isAnyStencilPopupOpen,
} from "../closeStencilPopups";

const stateWith = (
	stencilLibraryOpenCategory: string | null,
	isOtherShapesPopoverOpen: boolean,
): CanvasControllerState =>
	({
		stencilLibraryOpenCategory,
		isOtherShapesPopoverOpen,
	}) as unknown as CanvasControllerState;

describe("closeStencilPopups", () => {
	it("closes the category flyout and the Other shapes popover together", () => {
		expect(closeStencilPopups()).toEqual({
			stencilLibraryOpenCategory: null,
			isOtherShapesPopoverOpen: false,
		});
	});

	it("hands out a fresh object every call", () => {
		expect(closeStencilPopups()).not.toBe(closeStencilPopups());
	});
});

describe("isAnyStencilPopupOpen", () => {
	it.each([
		[null, false, false],
		["flowchart", false, true],
		[null, true, true],
		["flowchart", true, true],
	] as const)(
		"flyout %s, popover %s → %s",
		(openCategory, isPopoverOpen, expected) => {
			expect(
				isAnyStencilPopupOpen(stateWith(openCategory, isPopoverOpen)),
			).toBe(expected);
		},
	);
});
