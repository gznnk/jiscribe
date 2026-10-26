import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { ToggleSidebarsCommand } from "../ToggleSidebarsCommand";

const registries = createTestRegistries();

const makeState = (
	isLibraryOpen: boolean,
	isPropertyPanelOpen: boolean,
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		stencilLibraryPanel: {
			isOpen: isLibraryOpen,
			collapsedSectionIds: ["basic"],
		},
		propertyPanel: {
			isOpen: isPropertyPanelOpen,
			collapsedSectionIds: ["style"],
		},
		stencilLibraryOpenCategory: "flowchart",
		selection: selectionOf(["a"]),
	}) as unknown as CanvasControllerState;

const openFlagsAfterPress = (
	isLibraryOpen: boolean,
	isPropertyPanelOpen: boolean,
): [boolean, boolean] => {
	const next = ToggleSidebarsCommand.execute(
		makeState(isLibraryOpen, isPropertyPanelOpen),
		registries,
	);
	return [next.stencilLibraryPanel.isOpen, next.propertyPanel.isOpen];
};

describe("ToggleSidebarsCommand", () => {
	it("opens both sidebars when both are closed", () => {
		expect(openFlagsAfterPress(false, false)).toEqual([true, true]);
	});

	it("closes both sidebars when both are open", () => {
		expect(openFlagsAfterPress(true, true)).toEqual([false, false]);
	});

	/** A mixed state counts as expanded, so the press never leaves one open. */
	it("closes both sidebars when only the shape library is open", () => {
		expect(openFlagsAfterPress(true, false)).toEqual([false, false]);
	});

	it("closes both sidebars when only the properties sidebar is open", () => {
		expect(openFlagsAfterPress(false, true)).toEqual([false, false]);
	});

	it("closes the open category flyout, like every other toolbar press", () => {
		const next = ToggleSidebarsCommand.execute(
			makeState(false, false),
			registries,
		);
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("leaves both panels' collapsed sections and the selection alone", () => {
		const next = ToggleSidebarsCommand.execute(
			makeState(false, false),
			registries,
		);
		expect(next.stencilLibraryPanel.collapsedSectionIds).toEqual(["basic"]);
		expect(next.propertyPanel.collapsedSectionIds).toEqual(["style"]);
		expect(next.selection.objectIds).toEqual(["a"]);
	});

	it("carries no keyboard shortcut", () => {
		expect(ToggleSidebarsCommand.shortcuts).toBeUndefined();
	});

	it("is registered by default", () => {
		expect(registries.command.get("toggleSidebars")).toBe(
			ToggleSidebarsCommand,
		);
	});
});
