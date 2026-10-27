import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { ToggleStencilLibraryCommand } from "../ToggleStencilLibraryCommand";

const registries = createTestRegistries();

const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		isChromeExpanded: true,
		mode: { kind: "normal" },
		stencilLibraryPanel: { isOpen: false, collapsedSectionIds: ["basic"] },
		propertyPanel: { isOpen: true, collapsedSectionIds: ["style"] },
		stencilLibraryOpenCategory: "flowchart",
		isOtherShapesPopoverOpen: true,
		selection: selectionOf(["a"]),
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

	it("leaves the other sidebar as it is while expanded", () => {
		const next = ToggleStencilLibraryCommand.execute(makeState(), registries);
		expect(next.isChromeExpanded).toBe(true);
		expect(next.propertyPanel.isOpen).toBe(true);
	});

	/** Expanded with no sidebar open is a form of its own: only the switch collapses. */
	it("stays expanded when it closes the last open sidebar", () => {
		const next = ToggleStencilLibraryCommand.execute(
			makeState({
				stencilLibraryPanel: { isOpen: true, collapsedSectionIds: ["basic"] },
				propertyPanel: { isOpen: false, collapsedSectionIds: ["style"] },
			}),
			registries,
		);
		expect(next.isChromeExpanded).toBe(true);
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
	});

	/** Possible only where a host's collapsed pills show this toggle. */
	it.each([false, true])(
		"expands with the shape library alone open when pressed while collapsed (its flag %s)",
		(isOwnOpen) => {
			const next = ToggleStencilLibraryCommand.execute(
				makeState({
					isChromeExpanded: false,
					stencilLibraryPanel: {
						isOpen: isOwnOpen,
						collapsedSectionIds: ["basic"],
					},
				}),
				registries,
			);
			expect(next.isChromeExpanded).toBe(true);
			expect(next.stencilLibraryPanel.isOpen).toBe(true);
			expect(next.propertyPanel.isOpen).toBe(false);
		},
	);

	it("closes the open category flyout, like every other toolbar press", () => {
		const next = ToggleStencilLibraryCommand.execute(makeState(), registries);
		expect(next.stencilLibraryOpenCategory).toBeNull();
		expect(next.isOtherShapesPopoverOpen).toBe(false);
	});

	it("leaves the collapsed sections and the selection alone", () => {
		const next = ToggleStencilLibraryCommand.execute(makeState(), registries);
		expect(next.stencilLibraryPanel.collapsedSectionIds).toEqual(["basic"]);
		expect(next.selection.objectIds).toEqual(["a"]);
	});

	it("carries no keyboard shortcut", () => {
		expect(ToggleStencilLibraryCommand.shortcuts).toBeUndefined();
	});
});
