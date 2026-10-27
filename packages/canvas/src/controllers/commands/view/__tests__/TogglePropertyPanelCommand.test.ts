import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { TogglePropertyPanelCommand } from "../TogglePropertyPanelCommand";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		isChromeExpanded: true,
		mode: { kind: "normal" },
		propertyPanel: { isOpen: false, collapsedSectionIds: ["style"] },
		stencilLibraryPanel: { isOpen: true, collapsedSectionIds: ["basic"] },
		stencilLibraryOpenCategory: "flowchart",
		selection: selectionOf(["a"]),
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

	it("leaves the other sidebar as it is while expanded", () => {
		const next = TogglePropertyPanelCommand.execute(makeState(), registries);
		expect(next.isChromeExpanded).toBe(true);
		expect(next.stencilLibraryPanel.isOpen).toBe(true);
	});

	/** Expanded with no sidebar open is a form of its own: only the switch collapses. */
	it("stays expanded when it closes the last open sidebar", () => {
		const next = TogglePropertyPanelCommand.execute(
			makeState({
				propertyPanel: { isOpen: true, collapsedSectionIds: ["style"] },
				stencilLibraryPanel: { isOpen: false, collapsedSectionIds: ["basic"] },
			}),
			registries,
		);
		expect(next.isChromeExpanded).toBe(true);
		expect(next.propertyPanel.isOpen).toBe(false);
	});

	/** Possible only where a host's collapsed pills show this toggle. */
	it.each([false, true])(
		"expands with the properties sidebar alone open when pressed while collapsed (its flag %s)",
		(isOwnOpen) => {
			const next = TogglePropertyPanelCommand.execute(
				makeState({
					isChromeExpanded: false,
					propertyPanel: { isOpen: isOwnOpen, collapsedSectionIds: ["style"] },
				}),
				registries,
			);
			expect(next.isChromeExpanded).toBe(true);
			expect(next.propertyPanel.isOpen).toBe(true);
			expect(next.stencilLibraryPanel.isOpen).toBe(false);
		},
	);

	it("closes the open category flyout, like every other toolbar press", () => {
		const next = TogglePropertyPanelCommand.execute(makeState(), registries);
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("leaves the collapsed sections and the selection alone", () => {
		const next = TogglePropertyPanelCommand.execute(makeState(), registries);
		expect(next.propertyPanel.collapsedSectionIds).toEqual(["style"]);
		expect(next.selection.objectIds).toEqual(["a"]);
	});

	it("carries no keyboard shortcut", () => {
		expect(TogglePropertyPanelCommand.shortcuts).toBeUndefined();
	});
});
