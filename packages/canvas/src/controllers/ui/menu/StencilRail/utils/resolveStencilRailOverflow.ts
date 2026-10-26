import type { StencilRailPopoverKind } from "../../../../utils/stencilRailPopover";
import { STENCIL_BUTTON_SIZE } from "../../StencilLibrary/StencilLibraryStyled";
import {
	STENCIL_RAIL_DIVIDER_EXTENT,
	STENCIL_RAIL_GAP,
	STENCIL_RAIL_PADDING,
} from "../StencilRailStyled";

/** What the rail has to place, top to bottom, before any of it is moved out. */
export type StencilRailContents = {
	/** How many presets head the rail (resolved `rail.presetIds`). */
	presetCount: number;
	/** The pinned categories the library holds, in pin order. */
	pinnedCategoryIds: readonly string[];
	/** The categories the document uses that are not pinned, most-used first. */
	documentCategoryIds: readonly string[];
	/**
	 * The category the open stencil panel draws, flyout or docked; null when
	 * none is. It stays on the rail whatever else has to go.
	 */
	drawnCategoryId: string | null;
	/** Whether the rail ends with the catalog button (a library, and its command registered). */
	hasCatalogButton: boolean;
};

/** What the rail draws, and what its "…" button holds instead. */
export type StencilRailOverflow = {
	/** Whether the presets are folded into one button opening them in a popover. */
	arePresetsCollapsed: boolean;
	/** The pinned categories drawn on the rail, in pin order. */
	shownPinnedCategoryIds: string[];
	/** The pinned categories in "…", in pin order: the tail of the pins. */
	overflowedPinnedCategoryIds: string[];
	/** The document's categories drawn on the rail, most-used first. */
	shownDocumentCategoryIds: string[];
	/** The document's categories in "…", most-used first: the least-used ones. */
	overflowedDocumentCategoryIds: string[];
	/** Whether the solid divider stands between the presets and the shown pins. */
	hasPinnedDivider: boolean;
	/** Whether the dashed divider stands above the shown document categories. */
	hasDocumentDivider: boolean;
	/** Whether the "…" button is drawn: something is in it. */
	hasMoreButton: boolean;
	/** Whether the spacer pushes "…" and the catalog button to the bottom (either is drawn). */
	hasSpacer: boolean;
	/**
	 * Whether the layout was decided against a measured height. false for a
	 * rail not laid out (a height of 0), which moves nothing and so says
	 * nothing about what the rail would offer once it is.
	 */
	isLaidOut: boolean;
};

/** The height the rail's column needs for this layout, padding and gaps included (StencilRailStyled). */
const calcStencilRailContentHeight = (
	overflow: StencilRailOverflow,
	presetButtonCount: number,
	hasCatalogButton: boolean,
): number => {
	const buttonCount =
		presetButtonCount +
		overflow.shownPinnedCategoryIds.length +
		overflow.shownDocumentCategoryIds.length +
		(overflow.hasMoreButton ? 1 : 0) +
		(hasCatalogButton ? 1 : 0);
	const dividerCount =
		(overflow.hasPinnedDivider ? 1 : 0) + (overflow.hasDocumentDivider ? 1 : 0);
	// The spacer is an item of its own: no height, one gap.
	const itemCount = buttonCount + dividerCount + (overflow.hasSpacer ? 1 : 0);
	return (
		2 * STENCIL_RAIL_PADDING +
		buttonCount * STENCIL_BUTTON_SIZE +
		dividerCount * STENCIL_RAIL_DIVIDER_EXTENT +
		Math.max(itemCount - 1, 0) * STENCIL_RAIL_GAP
	);
};

/**
 * Decides what the rail draws in `railHeight` and what goes into its "…"
 * button, which appears just above the catalog button only while something
 * is in it.
 *
 * Categories leave the rail one at a time until the rest fits: the document's
 * first, least-used first, then the pins from the end of the pin order, so no
 * pin leaves while a document category other than the drawn one is still on
 * the rail. The drawn category never leaves: kept at the end of its group, it
 * takes the place of the last item there. Only when even every category in
 * "…" leaves the rail too short are the presets folded into one button, and
 * the categories then come back as far as the room it frees allows. The
 * catalog button and "…" are never folded; what still does not fit is cut off.
 *
 * @param railHeight - The rail's height in CSS px (its border box). 0 means
 *   the rail is not laid out (hidden, or no layout engine), and nothing is
 *   moved: there is no room to compare against
 * @param contents - What the rail has to place
 * @returns The ids drawn and the ids in "…", each list in its group's order
 */
export const resolveStencilRailOverflow = (
	railHeight: number,
	{
		presetCount,
		pinnedCategoryIds,
		documentCategoryIds,
		drawnCategoryId,
		hasCatalogButton,
	}: StencilRailContents,
): StencilRailOverflow => {
	// Leaving order: the document's least-used first, then the pins from the end.
	const leavingIds = [
		...[...documentCategoryIds].reverse(),
		...[...pinnedCategoryIds].reverse(),
	].filter((categoryId) => categoryId !== drawnCategoryId);

	const layOut = (
		arePresetsCollapsed: boolean,
		leavingCount: number,
	): StencilRailOverflow => {
		const overflowedIds = new Set(leavingIds.slice(0, leavingCount));
		const isShown = (categoryId: string) => !overflowedIds.has(categoryId);
		const isOverflowed = (categoryId: string) => overflowedIds.has(categoryId);
		const shownPinnedCategoryIds = pinnedCategoryIds.filter(isShown);
		const shownDocumentCategoryIds = documentCategoryIds.filter(isShown);
		const hasPresets = presetCount > 0;
		const hasMoreButton = overflowedIds.size > 0;
		return {
			arePresetsCollapsed,
			shownPinnedCategoryIds,
			overflowedPinnedCategoryIds: pinnedCategoryIds.filter(isOverflowed),
			shownDocumentCategoryIds,
			overflowedDocumentCategoryIds: documentCategoryIds.filter(isOverflowed),
			hasPinnedDivider: hasPresets && shownPinnedCategoryIds.length > 0,
			hasDocumentDivider:
				shownDocumentCategoryIds.length > 0 &&
				(hasPresets || shownPinnedCategoryIds.length > 0),
			hasMoreButton,
			hasSpacer: hasMoreButton || hasCatalogButton,
			isLaidOut: railHeight > 0,
		};
	};
	const fits = (overflow: StencilRailOverflow): boolean =>
		calcStencilRailContentHeight(
			overflow,
			overflow.arePresetsCollapsed ? Math.min(presetCount, 1) : presetCount,
			hasCatalogButton,
		) <= railHeight;

	if (railHeight === 0) {
		return layOut(false, 0);
	}
	// Folding a single preset frees nothing.
	const collapseSteps = presetCount > 1 ? [false, true] : [false];
	for (const arePresetsCollapsed of collapseSteps) {
		for (
			let leavingCount = 0;
			leavingCount <= leavingIds.length;
			leavingCount++
		) {
			const overflow = layOut(arePresetsCollapsed, leavingCount);
			if (fits(overflow)) {
				return overflow;
			}
		}
	}
	return layOut(collapseSteps[collapseSteps.length - 1], leavingIds.length);
};

/**
 * Whether the rail can show a popover of `kind` in this layout: "…" only while
 * something is in it, the presets' only while they are folded.
 *
 * @param kind - The popover open in the flyout's slot
 * @param overflow - The rail's current layout (resolveStencilRailOverflow)
 */
export const isStencilRailPopoverShowable = (
	kind: StencilRailPopoverKind,
	overflow: StencilRailOverflow,
): boolean =>
	kind === "railOverflow"
		? overflow.hasMoreButton
		: overflow.arePresetsCollapsed;
