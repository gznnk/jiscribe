import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { TogglePropertyPanelCommand } from "../TogglePropertyPanelCommand";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		propertyPanel: { isOpen: false, collapsedSectionIds: ["style"] },
		stencilLibraryOpenCategory: "flowchart",
		selectedIds: ["a"],
		...overrides,
	}) as unknown as CanvasControllerState;

describe("TogglePropertyPanelCommand", () => {
	it("opens the sidebar when it is closed", () => {
		const next = TogglePropertyPanelCommand.execute(makeState(), registries);
		expect(next.propertyPanel.isOpen).toBe(true);
	});

	it("closes the sidebar when it is open", () => {
		const next = TogglePropertyPanelCommand.execute(
			makeState({
				propertyPanel: { isOpen: true, collapsedSectionIds: ["style"] },
			}),
			registries,
		);
		expect(next.propertyPanel.isOpen).toBe(false);
	});

	it("closes the open category flyout, like every other toolbar press", () => {
		const next = TogglePropertyPanelCommand.execute(makeState(), registries);
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("leaves the collapsed sections and the selection alone", () => {
		const next = TogglePropertyPanelCommand.execute(makeState(), registries);
		expect(next.propertyPanel.collapsedSectionIds).toEqual(["style"]);
		expect(next.selectedIds).toEqual(["a"]);
	});

	it("carries no keyboard shortcut", () => {
		expect(TogglePropertyPanelCommand.shortcuts).toBeUndefined();
	});
});
