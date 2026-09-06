import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { ToggleStencilLibraryCommand } from "../ToggleStencilLibraryCommand";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		stencilLibraryPanel: { isOpen: false, collapsedSectionIds: ["basic"] },
		stencilLibraryOpenCategory: "flowchart",
		selectedIds: ["a"],
		...overrides,
	}) as unknown as CanvasControllerState;

describe("ToggleStencilLibraryCommand", () => {
	it("opens the sidebar when it is closed", () => {
		const next = ToggleStencilLibraryCommand.execute(makeState(), registries);
		expect(next.stencilLibraryPanel.isOpen).toBe(true);
	});

	it("closes the sidebar when it is open", () => {
		const next = ToggleStencilLibraryCommand.execute(
			makeState({
				stencilLibraryPanel: { isOpen: true, collapsedSectionIds: ["basic"] },
			}),
			registries,
		);
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
	});

	it("closes the open category flyout, like every other toolbar press", () => {
		const next = ToggleStencilLibraryCommand.execute(makeState(), registries);
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("leaves the collapsed sections and the selection alone", () => {
		const next = ToggleStencilLibraryCommand.execute(makeState(), registries);
		expect(next.stencilLibraryPanel.collapsedSectionIds).toEqual(["basic"]);
		expect(next.selectedIds).toEqual(["a"]);
	});

	it("carries no keyboard shortcut", () => {
		expect(ToggleStencilLibraryCommand.shortcuts).toBeUndefined();
	});
});
