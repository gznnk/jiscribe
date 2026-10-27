import { useEffect, useRef } from "react";

import { useLatestRef } from "../../foundation/hooks/useLatestRef";
import type {
	CanvasSidebarsState,
	PropertyPanelState,
	SidebarPanelId,
	StencilLibraryPanelState,
} from "../CanvasTypes";
import { resolveSidebarsState } from "../utils/sidebarsState";

/**
 * Notifies the host when the chrome expands or collapses, or either sidebar
 * opens, closes, or has a section collapsed or expanded. The shape library's
 * sections are folded from the Other shapes popover as well (the two share
 * `stencilLibraryPanel.collapsedSectionIds`), so a fold there is reported too.
 *
 * All of it is reported together: a host persisting the chrome wants a single
 * value to hand back through `initialConfig.sidebars`, so any change delivers
 * the whole state.
 *
 * Comparison is by value (the form, each edge's `isOpen` plus the ids of each
 * panel's collapsed sections in order), not by reference: a panel that ends up
 * where it already was must not be reported. The callback goes through a ref so a host
 * passing a new function each render cannot re-fire the effect.
 *
 * Read-only by contract: the host must not feed the reported state back in to
 * drive the chrome (there is no controlled prop). It is moved by the user, by
 * the `toggleStencilLibrary` / `togglePropertyPanel` / `toggleSidebars`
 * commands, and by nothing else.
 *
 * The mount render establishes the baseline (the seeded or default panel state)
 * and does not notify; the host assumes what it passed in until the first
 * change.
 *
 * @param isChromeExpanded - Live form of the chrome, reported as `isExpanded`
 * @param stencilLibraryPanel - Live state of the shape library panel, reported
 *   as the left edge
 * @param propertyPanel - Live state of the properties panel, reported as the
 *   right edge
 * @param onSidebarsChange - Callback invoked with the form and both sidebars on any change
 */
export const useNotifySidebarsChange = (
	isChromeExpanded: boolean,
	stencilLibraryPanel: StencilLibraryPanelState,
	propertyPanel: PropertyPanelState,
	onSidebarsChange?: (sidebars: CanvasSidebarsState) => void,
): void => {
	const onSidebarsChangeRef = useLatestRef(onSidebarsChange);

	// null marks "before the first render"; the mount render only records the
	// baseline so the starting panel state is not delivered as a change.
	const prevSidebarsRef = useRef<CanvasSidebarsState | null>(null);
	useEffect(() => {
		const sidebars = resolveSidebarsState({
			isChromeExpanded,
			stencilLibraryPanel,
			propertyPanel,
		});
		const prevSidebars = prevSidebarsRef.current;
		if (prevSidebars !== null && isSameSidebarsState(prevSidebars, sidebars)) {
			return;
		}
		const isMountBaseline = prevSidebars === null;
		prevSidebarsRef.current = sidebars;
		if (isMountBaseline) {
			return;
		}
		onSidebarsChangeRef.current?.(sidebars);
	}, [
		isChromeExpanded,
		stencilLibraryPanel,
		propertyPanel,
		onSidebarsChangeRef,
	]);
};

/** True when the form, both edges and every panel of `a` are in the same state as those of `b`. */
const isSameSidebarsState = (
	a: CanvasSidebarsState,
	b: CanvasSidebarsState,
): boolean =>
	a.isExpanded === b.isExpanded &&
	a.left.isOpen === b.left.isOpen &&
	a.right.isOpen === b.right.isOpen &&
	(Object.keys(a.panels) as SidebarPanelId[]).every((panelId) =>
		isSameCollapsedSectionIds(
			a.panels[panelId].collapsedSectionIds,
			b.panels[panelId].collapsedSectionIds,
		),
	);

/** True when two panels agree on which sections are collapsed, order included. */
const isSameCollapsedSectionIds = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((sectionId, index) => sectionId === b[index]);
};
