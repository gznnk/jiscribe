import type {
	CanvasInitialSidebars,
	CanvasSidebarsState,
	PropertyPanelState,
	StencilLibraryPanelState,
} from "../CanvasTypes";

/** The reducer's two panel states, as the seed hands them over. */
export type SeededSidebarPanels = {
	/** Seed for `CanvasControllerState.stencilLibraryPanel` (the left edge). */
	stencilLibraryPanel: StencilLibraryPanelState;
	/** Seed for `CanvasControllerState.propertyPanel` (the right edge). */
	propertyPanel: PropertyPanelState;
};

/**
 * The one place the two reducer panels are matched to the edges a host sees:
 * the stencil library is the left sidebar, the property panel the right one.
 *
 * @param stencilLibraryPanel - Reducer state of the shape library panel; its
 *   `isOpen` becomes `left`, its collapsed sections the `"stencilLibrary"` panel
 * @param propertyPanel - Reducer state of the properties panel; its `isOpen`
 *   becomes `right`, its collapsed sections the `"properties"` panel
 * @returns The public pair, split into per-edge and per-panel state. The section
 *   id arrays are passed through rather than copied, so callers must treat them
 *   as read-only (the reducer already does).
 */
export const resolveSidebarsState = (
	stencilLibraryPanel: StencilLibraryPanelState,
	propertyPanel: PropertyPanelState,
): CanvasSidebarsState => ({
	left: { isOpen: stencilLibraryPanel.isOpen },
	right: { isOpen: propertyPanel.isOpen },
	panels: {
		stencilLibrary: {
			collapsedSectionIds: stencilLibraryPanel.collapsedSectionIds,
		},
		properties: { collapsedSectionIds: propertyPanel.collapsedSectionIds },
	},
});

/**
 * The inverse of {@link resolveSidebarsState}: fills in what a host left out so
 * the reducer starts from complete panel states.
 *
 * @param initialSidebars - `initialConfig.sidebars` as read at mount; undefined,
 *   or any key of it left out, means closed with every section expanded
 * @returns Both reducer panel states, each with `isOpen` and
 *   `collapsedSectionIds` set
 */
export const seedSidebarPanels = (
	initialSidebars: CanvasInitialSidebars | undefined,
): SeededSidebarPanels => ({
	stencilLibraryPanel: {
		isOpen: initialSidebars?.left?.isOpen ?? false,
		collapsedSectionIds:
			initialSidebars?.panels?.stencilLibrary?.collapsedSectionIds ?? [],
	},
	propertyPanel: {
		isOpen: initialSidebars?.right?.isOpen ?? false,
		collapsedSectionIds:
			initialSidebars?.panels?.properties?.collapsedSectionIds ?? [],
	},
});
