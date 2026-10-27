import type {
	CanvasControllerState,
	CanvasInitialSidebars,
	CanvasSidebarsState,
} from "../CanvasTypes";

/** The reducer's share of the chrome: its form and the two panels. */
export type ChromeSidebarsState = Pick<
	CanvasControllerState,
	"isChromeExpanded" | "stencilLibraryPanel" | "propertyPanel"
>;

/**
 * The one place the reducer's chrome state is matched to what a host sees:
 * `isChromeExpanded` is `isExpanded`, the stencil library is the left sidebar
 * and the property panel the right one.
 *
 * @param chromeSidebars - The reducer's form and panel states; the library's
 *   `isOpen` becomes `left`, the properties panel's `right`, each panel's
 *   collapsed sections its entry under `panels`
 * @returns The public state, split into the form, per-edge and per-panel
 *   state. The section id arrays are passed through rather than copied, so
 *   callers must treat them as read-only (the reducer already does).
 */
export const resolveSidebarsState = (
	chromeSidebars: ChromeSidebarsState,
): CanvasSidebarsState => ({
	isExpanded: chromeSidebars.isChromeExpanded,
	left: { isOpen: chromeSidebars.stencilLibraryPanel.isOpen },
	right: { isOpen: chromeSidebars.propertyPanel.isOpen },
	panels: {
		stencilLibrary: {
			collapsedSectionIds:
				chromeSidebars.stencilLibraryPanel.collapsedSectionIds,
		},
		properties: {
			collapsedSectionIds: chromeSidebars.propertyPanel.collapsedSectionIds,
		},
	},
});

/**
 * The inverse of {@link resolveSidebarsState}: fills in what a host left out so
 * the reducer starts from a complete chrome state.
 *
 * @param initialSidebars - `initialConfig.sidebars` as read at mount; undefined,
 *   or any key of it left out, means collapsed, each edge closed and every
 *   section expanded
 * @returns The form and both panel states, every field set
 */
export const seedChromeSidebars = (
	initialSidebars: CanvasInitialSidebars | undefined,
): ChromeSidebarsState => ({
	isChromeExpanded: initialSidebars?.isExpanded ?? false,
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

/**
 * Whether the shape library sidebar is drawn: open, in the expanded chrome.
 * What its toolbar toggle shows as pressed.
 *
 * @param chromeSidebars - Only `isChromeExpanded` and the library's `isOpen`
 *   are read
 */
export const isStencilLibraryPanelShown = (
	chromeSidebars: Pick<
		CanvasControllerState,
		"isChromeExpanded" | "stencilLibraryPanel"
	>,
): boolean =>
	chromeSidebars.isChromeExpanded && chromeSidebars.stencilLibraryPanel.isOpen;

/**
 * Whether the properties sidebar is drawn: open, in the expanded chrome.
 * What its toolbar toggle shows as pressed.
 *
 * @param chromeSidebars - Only `isChromeExpanded` and the panel's `isOpen` are
 *   read
 */
export const isPropertyPanelShown = (
	chromeSidebars: Pick<
		CanvasControllerState,
		"isChromeExpanded" | "propertyPanel"
	>,
): boolean =>
	chromeSidebars.isChromeExpanded && chromeSidebars.propertyPanel.isOpen;
