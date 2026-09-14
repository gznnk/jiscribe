import { describe, expect, it } from "vitest";

import { resolveSidebarsState, seedSidebarPanels } from "../sidebarsState";

/**
 * The pair carries the edge/panel split in one direction and fills the host's
 * gaps in the other, so what a canvas reports is exactly what restores it.
 */
describe("sidebarsState", () => {
	it("maps the stencil library to the left edge and the property panel to the right", () => {
		const sidebars = resolveSidebarsState(
			{ isOpen: true, collapsedSectionIds: ["basic"] },
			{ isOpen: false, collapsedSectionIds: ["text", "border"] },
		);

		expect(sidebars).toEqual({
			left: { isOpen: true },
			right: { isOpen: false },
			panels: {
				stencilLibrary: { collapsedSectionIds: ["basic"] },
				properties: { collapsedSectionIds: ["text", "border"] },
			},
		});
	});

	it("seeds the panels back from what it reported", () => {
		const stencilLibraryPanel = {
			isOpen: false,
			collapsedSectionIds: ["basic"],
		};
		const propertyPanel = { isOpen: true, collapsedSectionIds: ["text"] };

		expect(
			seedSidebarPanels(
				resolveSidebarsState(stencilLibraryPanel, propertyPanel),
			),
		).toEqual({ stencilLibraryPanel, propertyPanel });
	});

	it("fills in both panels when nothing is restored", () => {
		expect(seedSidebarPanels(undefined)).toEqual({
			stencilLibraryPanel: { isOpen: false, collapsedSectionIds: [] },
			propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		});
	});

	it("defaults the keys a partial restore leaves out", () => {
		expect(
			seedSidebarPanels({
				right: { isOpen: true },
				panels: { stencilLibrary: { collapsedSectionIds: ["basic"] } },
			}),
		).toEqual({
			stencilLibraryPanel: { isOpen: false, collapsedSectionIds: ["basic"] },
			propertyPanel: { isOpen: true, collapsedSectionIds: [] },
		});
	});
});
