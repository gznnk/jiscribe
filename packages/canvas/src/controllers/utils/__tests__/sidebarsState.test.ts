import { describe, expect, it } from "vitest";

import type { CanvasInitialSidebars } from "../../CanvasTypes";
import { resolveSidebarsState, seedSidebarPanels } from "../sidebarsState";

/**
 * The pair carries the edge/panel split in one direction and fills the host's
 * gaps in the other, so what a canvas reports is exactly what restores it.
 */
describe("sidebarsState", () => {
	it("maps the docked stencil panel to the left edge and the property panel to the right", () => {
		const sidebars = resolveSidebarsState(
			{ isOpen: true, content: { kind: "category", categoryId: "flowchart" } },
			{ isOpen: false, collapsedSectionIds: ["text", "border"] },
		);

		expect(sidebars).toEqual({
			left: { isOpen: true },
			right: { isOpen: false },
			panels: {
				stencilLibrary: {
					content: { kind: "category", categoryId: "flowchart" },
				},
				properties: { collapsedSectionIds: ["text", "border"] },
			},
		});
	});

	it("seeds the panels back from what it reported", () => {
		const stencilLibraryPanel = {
			isOpen: false,
			content: { kind: "category", categoryId: "uml" } as const,
		};
		const propertyPanel = { isOpen: true, collapsedSectionIds: ["text"] };

		expect(
			seedSidebarPanels(
				resolveSidebarsState(stencilLibraryPanel, propertyPanel),
			),
		).toEqual({ stencilLibraryPanel, propertyPanel });
	});

	it("fills in both panels when nothing is restored, the stencil panel on the catalog", () => {
		expect(seedSidebarPanels(undefined)).toEqual({
			stencilLibraryPanel: { isOpen: false, content: { kind: "catalog" } },
			propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		});
	});

	it("defaults the keys a partial restore leaves out", () => {
		expect(
			seedSidebarPanels({
				right: { isOpen: true },
				panels: { properties: { collapsedSectionIds: ["text"] } },
			}),
		).toEqual({
			stencilLibraryPanel: { isOpen: false, content: { kind: "catalog" } },
			propertyPanel: { isOpen: true, collapsedSectionIds: ["text"] },
		});
	});

	/**
	 * What a host persisted before the docked panel had a content: the left
	 * edge and the shape library's collapsed sections. The edge still opens, on
	 * the catalog, the one view of the old sidebar's whole list.
	 */
	it("opens a value stored before the panel had a content on the catalog", () => {
		const legacySidebars = JSON.parse(
			JSON.stringify({
				left: { isOpen: true },
				right: { isOpen: false },
				panels: {
					stencilLibrary: { collapsedSectionIds: ["basic"] },
					properties: { collapsedSectionIds: [] },
				},
			}),
		) as CanvasInitialSidebars;

		expect(seedSidebarPanels(legacySidebars).stencilLibraryPanel).toEqual({
			isOpen: true,
			content: { kind: "catalog" },
		});
	});
});
