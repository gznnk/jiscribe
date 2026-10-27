import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { ToggleSidebarsCommand } from "../ToggleSidebarsCommand";

const registries = createTestRegistries();

const makeState = (
	isChromeExpanded: boolean,
	isLibraryOpen: boolean,
	isPropertyPanelOpen: boolean,
): CanvasControllerState =>
	({
		isChromeExpanded,
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
		isOtherShapesPopoverOpen: true,
		selection: selectionOf(["a"]),
	}) as unknown as CanvasControllerState;

/** [isChromeExpanded, library isOpen, properties isOpen] after one press. */
type ChromeFlags = [boolean, boolean, boolean];

const flagsOf = (state: CanvasControllerState): ChromeFlags => [
	state.isChromeExpanded,
	state.stencilLibraryPanel.isOpen,
	state.propertyPanel.isOpen,
];

const flagsAfterSwitch = (...before: ChromeFlags): ChromeFlags =>
	flagsOf(ToggleSidebarsCommand.execute(makeState(...before), registries));

describe("ToggleSidebarsCommand", () => {
	it("opens both sidebars when expanding with both closed", () => {
		expect(flagsAfterSwitch(false, false, false)).toEqual([true, true, true]);
	});

	/** Collapsing kept the flags, so expanding brings the last layout back. */
	it.each<[string, boolean, boolean]>([
		["the shape library alone", true, false],
		["the properties sidebar alone", false, true],
		["both sidebars", true, true],
	])(
		"restores %s when expanding",
		(_layout, isLibraryOpen, isPropertyPanelOpen) => {
			expect(
				flagsAfterSwitch(false, isLibraryOpen, isPropertyPanelOpen),
			).toEqual([true, isLibraryOpen, isPropertyPanelOpen]);
		},
	);

	it.each<[string, boolean, boolean]>([
		["both open", true, true],
		["one open", true, false],
		["both closed", false, false],
	])(
		"collapses with %s, leaving each panel's flag as it was",
		(_layout, isLibraryOpen, isPropertyPanelOpen) => {
			expect(
				flagsAfterSwitch(true, isLibraryOpen, isPropertyPanelOpen),
			).toEqual([false, isLibraryOpen, isPropertyPanelOpen]);
		},
	);

	it("closes the open category flyout, like every other toolbar press", () => {
		for (const isChromeExpanded of [false, true]) {
			const next = ToggleSidebarsCommand.execute(
				makeState(isChromeExpanded, false, false),
				registries,
			);
			expect(next.stencilLibraryOpenCategory).toBeNull();
			expect(next.isOtherShapesPopoverOpen).toBe(false);
		}
	});

	it("leaves both panels' collapsed sections and the selection alone", () => {
		const next = ToggleSidebarsCommand.execute(
			makeState(false, false, false),
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
