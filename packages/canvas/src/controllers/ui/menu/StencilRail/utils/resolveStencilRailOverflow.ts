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
	/** Whether the catalog button closes the rail (a library, and its command registered). */
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
};

type StencilRailItemCounts = {
	presetButtonCount: number;
	pinnedCount: number;
	documentCount: number;
	hasMoreButton: boolean;
	hasCatalogButton: boolean;
};

/** The height the rail's column needs for these items, padding and gaps included (StencilRailStyled). */
const calcStencilRailContentHeight = ({
	presetButtonCount,
	pinnedCount,
	documentCount,
	hasMoreButton,
	hasCatalogButton,
}: StencilRailItemCounts): number => {
	const hasPinnedDivider = pinnedCount > 0 && presetButtonCount > 0;
	const hasDocumentDivider =
		documentCount > 0 && (presetButtonCount > 0 || pinnedCount > 0);
	const hasBottomGroup = hasMoreButton || hasCatalogButton;
	const buttonCount =
		presetButtonCount +
		pinnedCount +
		documentCount +
		(hasMoreButton ? 1 : 0) +
		(hasCatalogButton ? 1 : 0);
	const dividerCount =
		(hasPinnedDivider ? 1 : 0) + (hasDocumentDivider ? 1 : 0);
	// The spacer pushing the bottom group down is an item of its own: no height, one gap.
	const itemCount = buttonCount + dividerCount + (hasBottomGroup ? 1 : 0);
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
		return {
			arePresetsCollapsed,
			shownPinnedCategoryIds: pinnedCategoryIds.filter(isShown),
			overflowedPinnedCategoryIds: pinnedCategoryIds.filter(isOverflowed),
			shownDocumentCategoryIds: documentCategoryIds.filter(isShown),
			overflowedDocumentCategoryIds: documentCategoryIds.filter(isOverflowed),
		};
	};
	const fits = (overflow: StencilRailOverflow): boolean =>
		calcStencilRailContentHeight({
			presetButtonCount: overflow.arePresetsCollapsed
				? Math.min(presetCount, 1)
				: presetCount,
			pinnedCount: overflow.shownPinnedCategoryIds.length,
			documentCount: overflow.shownDocumentCategoryIds.length,
			hasMoreButton:
				overflow.overflowedPinnedCategoryIds.length > 0 ||
				overflow.overflowedDocumentCategoryIds.length > 0,
			hasCatalogButton,
		}) <= railHeight;

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
