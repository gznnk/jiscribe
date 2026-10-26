import { CATALOG_PANEL_CONTENT } from "./stencilPanelContent";
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
 * the docked stencil panel is the left sidebar, the property panel the right
 * one.
 *
 * @param stencilLibraryPanel - Reducer state of the docked stencil panel; its
 *   `isOpen` becomes `left`, its content the `"stencilLibrary"` panel. The
 *   flyout over the canvas is not part of it and is never reported
 * @param propertyPanel - Reducer state of the properties panel; its `isOpen`
 *   becomes `right`, its collapsed sections the `"properties"` panel
 * @returns The public pair, split into per-edge and per-panel state. The content
 *   and the section id array are passed through rather than copied, so callers
 *   must treat them as read-only (the reducer already does).
 */
export const resolveSidebarsState = (
	stencilLibraryPanel: StencilLibraryPanelState,
	propertyPanel: PropertyPanelState,
): CanvasSidebarsState => ({
	left: { isOpen: stencilLibraryPanel.isOpen },
	right: { isOpen: propertyPanel.isOpen },
	panels: {
		stencilLibrary: { content: stencilLibraryPanel.content },
		properties: { collapsedSectionIds: propertyPanel.collapsedSectionIds },
	},
});

/**
 * The inverse of {@link resolveSidebarsState}: fills in what a host left out so
 * the reducer starts from complete panel states.
 *
 * @param initialSidebars - `initialConfig.sidebars` as read at mount; undefined,
 *   or any key of it left out, means closed. The stencil panel without a
 *   `content` (left out, or stored before the panel had one) shows the catalog,
 *   and the properties panel without collapsed sections has every one expanded
 * @returns Both reducer panel states, complete
 */
export const seedSidebarPanels = (
	initialSidebars: CanvasInitialSidebars | undefined,
): SeededSidebarPanels => ({
	stencilLibraryPanel: {
		isOpen: initialSidebars?.left?.isOpen ?? false,
		content:
			initialSidebars?.panels?.stencilLibrary?.content ?? CATALOG_PANEL_CONTENT,
	},
	propertyPanel: {
		isOpen: initialSidebars?.right?.isOpen ?? false,
		collapsedSectionIds:
			initialSidebars?.panels?.properties?.collapsedSectionIds ?? [],
	},
});
