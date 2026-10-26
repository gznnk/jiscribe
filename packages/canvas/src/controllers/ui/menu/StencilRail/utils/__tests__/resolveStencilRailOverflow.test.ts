import { describe, expect, it } from "vitest";

import { STENCIL_BUTTON_SIZE } from "../../../StencilLibrary/StencilLibraryStyled";
import {
	STENCIL_RAIL_DIVIDER_EXTENT,
	STENCIL_RAIL_GAP,
	STENCIL_RAIL_PADDING,
} from "../../StencilRailStyled";
import {
	type StencilRailContents,
	type StencilRailOverflow,
	isStencilRailPopoverShowable,
	resolveStencilRailOverflow,
} from "../resolveStencilRailOverflow";

/** Eight presets, the catalog button and four pins. */
const fullRail: StencilRailContents = {
	presetCount: 8,
	hasCatalogButton: true,
	pinnedCategoryIds: ["pin-a", "pin-b", "pin-c", "pin-d"],
	drawnCategoryId: null,
};

/** Every height from tall to short, with what the rail does at it. */
const scanHeights = (
	contents: StencilRailContents,
): { railHeight: number; overflow: StencilRailOverflow }[] => {
	const results = [];
	for (let railHeight = 800; railHeight >= 1; railHeight--) {
		results.push({
			railHeight,
			overflow: resolveStencilRailOverflow(railHeight, contents),
		});
	}
	return results;
};

describe("resolveStencilRailOverflow", () => {
	it("moves nothing into '…' when everything fits, or when the rail is not laid out", () => {
		for (const [railHeight, isLaidOut] of [
			[800, true],
			[0, false],
		] as const) {
			expect(resolveStencilRailOverflow(railHeight, fullRail)).toEqual({
				arePresetsCollapsed: false,
				shownPinnedCategoryIds: ["pin-a", "pin-b", "pin-c", "pin-d"],
				overflowedPinnedCategoryIds: [],
				hasCatalogDivider: true,
				hasPinnedDivider: true,
				hasMoreButton: false,
				isLaidOut,
			});
		}
	});

	it("counts the rail's padding, buttons, dividers and gaps exactly, the catalog button at the top and '…' after the pins", () => {
		const contents: StencilRailContents = {
			presetCount: 2,
			hasCatalogButton: true,
			pinnedCategoryIds: ["pin-a", "pin-b"],
			drawnCategoryId: null,
		};
		// Two presets, two dividers, the catalog button and "…": every pin out.
		const withMoreButtonAlone =
			2 * STENCIL_RAIL_PADDING +
			4 * STENCIL_BUTTON_SIZE +
			2 * STENCIL_RAIL_DIVIDER_EXTENT +
			5 * STENCIL_RAIL_GAP;
		expect(
			resolveStencilRailOverflow(withMoreButtonAlone, contents)
				.overflowedPinnedCategoryIds,
		).toEqual(["pin-a", "pin-b"]);
		// One button and one gap more: both pins on the rail, no "…".
		expect(
			resolveStencilRailOverflow(
				withMoreButtonAlone + STENCIL_BUTTON_SIZE + STENCIL_RAIL_GAP,
				contents,
			).overflowedPinnedCategoryIds,
		).toEqual([]);
		expect(
			resolveStencilRailOverflow(withMoreButtonAlone - 1, contents)
				.arePresetsCollapsed,
		).toBe(true);
	});

	it("moves the pins out from the end of the pin order", () => {
		const leavingOrder = ["pin-d", "pin-c", "pin-b", "pin-a"];
		const seenOverflowedCounts = new Set<number>();
		for (const { overflow } of scanHeights(fullRail)) {
			if (overflow.arePresetsCollapsed) {
				break;
			}
			// Whatever is in "…" is a head of the leaving order. Two can leave at
			// once: the first one out only pays for the "…" button that takes its place.
			expect(new Set(overflow.overflowedPinnedCategoryIds)).toEqual(
				new Set(
					leavingOrder.slice(0, overflow.overflowedPinnedCategoryIds.length),
				),
			);
			seenOverflowedCounts.add(overflow.overflowedPinnedCategoryIds.length);
		}
		expect(seenOverflowedCounts).toContain(leavingOrder.length);
	});

	it("keeps the drawn category on the rail at every height, at the end of the pins", () => {
		for (const { overflow } of scanHeights({
			...fullRail,
			drawnCategoryId: "pin-a",
		})) {
			expect(overflow.overflowedPinnedCategoryIds).not.toContain("pin-a");
		}
		// Where two of four pins fit, the drawn last pin takes the second place.
		const twoShown = scanHeights(fullRail).find(
			({ overflow }) => overflow.shownPinnedCategoryIds.length === 2,
		);
		const drawnLastPin = resolveStencilRailOverflow(twoShown!.railHeight, {
			...fullRail,
			drawnCategoryId: "pin-d",
		});
		expect(drawnLastPin.shownPinnedCategoryIds).toEqual(["pin-a", "pin-d"]);
		expect(drawnLastPin.overflowedPinnedCategoryIds).toEqual([
			"pin-b",
			"pin-c",
		]);
	});

	it("folds the presets only once every pin in '…' still does not fit, and lets the pins back", () => {
		const scan = scanHeights(fullRail);
		const firstCollapsedIndex = scan.findIndex(
			({ overflow }) => overflow.arePresetsCollapsed,
		);
		expect(firstCollapsedIndex).toBeGreaterThan(0);
		const lastUncollapsed = scan[firstCollapsedIndex - 1].overflow;
		expect(lastUncollapsed.overflowedPinnedCategoryIds).toEqual(
			fullRail.pinnedCategoryIds,
		);
		const firstCollapsed = scan[firstCollapsedIndex].overflow;
		expect(firstCollapsed.overflowedPinnedCategoryIds).toEqual([]);
		// Folded for good below that height; the catalog button stays after it.
		for (const { overflow } of scan.slice(firstCollapsedIndex)) {
			expect(overflow.arePresetsCollapsed).toBe(true);
			expect(overflow.hasCatalogDivider).toBe(true);
		}
	});

	it("never folds a single preset, which would free nothing", () => {
		for (const { overflow } of scanHeights({ ...fullRail, presetCount: 1 })) {
			expect(overflow.arePresetsCollapsed).toBe(false);
		}
	});

	it("draws each divider only with something on both sides", () => {
		const noPins = resolveStencilRailOverflow(800, {
			...fullRail,
			pinnedCategoryIds: [],
		});
		expect(noPins.hasCatalogDivider).toBe(true);
		// Nothing follows the catalog button.
		expect(noPins.hasPinnedDivider).toBe(false);
		const noPresets = resolveStencilRailOverflow(800, {
			...fullRail,
			presetCount: 0,
		});
		expect(noPresets.hasCatalogDivider).toBe(false);
		expect(noPresets.hasPinnedDivider).toBe(true);
		const noCatalog = resolveStencilRailOverflow(800, {
			...fullRail,
			hasCatalogButton: false,
		});
		expect(noCatalog.hasCatalogDivider).toBe(false);
		expect(noCatalog.hasPinnedDivider).toBe(true);
		const pinsAlone = resolveStencilRailOverflow(800, {
			...fullRail,
			presetCount: 0,
			hasCatalogButton: false,
		});
		expect(pinsAlone.hasPinnedDivider).toBe(false);
		// Every pin in "…": the divider stays above "…".
		const lastUncollapsed = scanHeights(fullRail)
			.map(({ overflow }) => overflow)
			.filter((overflow) => !overflow.arePresetsCollapsed)
			.at(-1)!;
		expect(lastUncollapsed.shownPinnedCategoryIds).toEqual([]);
		expect(lastUncollapsed.hasMoreButton).toBe(true);
		expect(lastUncollapsed.hasPinnedDivider).toBe(true);
	});
});

describe("isStencilRailPopoverShowable", () => {
	it("offers '…' only while something is in it, and the presets' popover only while they are folded", () => {
		const roomy = resolveStencilRailOverflow(800, fullRail);
		expect(isStencilRailPopoverShowable("railOverflow", roomy)).toBe(false);
		expect(isStencilRailPopoverShowable("railPresets", roomy)).toBe(false);
		const folded = resolveStencilRailOverflow(1, fullRail);
		expect(isStencilRailPopoverShowable("railOverflow", folded)).toBe(true);
		expect(isStencilRailPopoverShowable("railPresets", folded)).toBe(true);
	});
});
