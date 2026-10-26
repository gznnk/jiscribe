import { describe, expect, it } from "vitest";

import { STENCIL_BUTTON_SIZE } from "../../../StencilLibrary/StencilLibraryStyled";
import {
	STENCIL_RAIL_GAP,
	STENCIL_RAIL_PADDING,
} from "../../StencilRailStyled";
import {
	type StencilRailContents,
	type StencilRailOverflow,
	isStencilRailPopoverShowable,
	resolveStencilRailOverflow,
} from "../resolveStencilRailOverflow";

/** Eight presets, two pins and two document categories, with the catalog button. */
const fullRail: StencilRailContents = {
	presetCount: 8,
	pinnedCategoryIds: ["pin-a", "pin-b"],
	documentCategoryIds: ["doc-most", "doc-least"],
	drawnCategoryId: null,
	hasCatalogButton: true,
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

const overflowedIdsOf = (overflow: StencilRailOverflow): string[] => [
	...overflow.overflowedDocumentCategoryIds,
	...overflow.overflowedPinnedCategoryIds,
];

describe("resolveStencilRailOverflow", () => {
	it("moves nothing into '…' when everything fits, or when the rail is not laid out", () => {
		for (const [railHeight, isLaidOut] of [
			[800, true],
			[0, false],
		] as const) {
			expect(resolveStencilRailOverflow(railHeight, fullRail)).toEqual({
				arePresetsCollapsed: false,
				shownPinnedCategoryIds: ["pin-a", "pin-b"],
				overflowedPinnedCategoryIds: [],
				shownDocumentCategoryIds: ["doc-most", "doc-least"],
				overflowedDocumentCategoryIds: [],
				hasPinnedDivider: true,
				hasDocumentDivider: true,
				hasMoreButton: false,
				hasSpacer: true,
				isLaidOut,
			});
		}
	});

	it("counts the rail's padding, buttons and gaps exactly", () => {
		// Two presets, the spacer and the catalog button: four items, three gaps.
		const contents: StencilRailContents = {
			presetCount: 2,
			pinnedCategoryIds: ["pin-a"],
			documentCategoryIds: [],
			drawnCategoryId: null,
			hasCatalogButton: true,
		};
		const withoutPin =
			2 * STENCIL_RAIL_PADDING + 3 * STENCIL_BUTTON_SIZE + 3 * STENCIL_RAIL_GAP;
		// The pin out means "…" in: one button and one gap more than the bare rail.
		const withMoreButton = withoutPin + STENCIL_BUTTON_SIZE + STENCIL_RAIL_GAP;
		expect(
			resolveStencilRailOverflow(withMoreButton, contents)
				.overflowedPinnedCategoryIds,
		).toEqual(["pin-a"]);
		expect(
			resolveStencilRailOverflow(withMoreButton - 1, contents)
				.arePresetsCollapsed,
		).toBe(true);
	});

	it("moves the document's categories out least-used first, then the pins from the end", () => {
		const leavingOrder = ["doc-least", "doc-most", "pin-b", "pin-a"];
		const seenOverflowedCounts = new Set<number>();
		for (const { overflow } of scanHeights(fullRail)) {
			if (overflow.arePresetsCollapsed) {
				break;
			}
			// Whatever is in "…" is a head of the leaving order. Two can leave at
			// once: the first one out only pays for the "…" button that takes its place.
			const overflowedIds = overflowedIdsOf(overflow);
			expect(new Set(overflowedIds)).toEqual(
				new Set(leavingOrder.slice(0, overflowedIds.length)),
			);
			seenOverflowedCounts.add(overflowedIds.length);
		}
		expect(seenOverflowedCounts).toContain(leavingOrder.length);
	});

	it("keeps the drawn category on the rail at every height, at the end of its group", () => {
		for (const drawnCategoryId of ["doc-most", "pin-a"]) {
			for (const { overflow } of scanHeights({
				...fullRail,
				drawnCategoryId,
			})) {
				expect(overflowedIdsOf(overflow)).not.toContain(drawnCategoryId);
			}
		}
		// Where one of two pins fits, the drawn first pin stays and the other goes.
		const pinsOnly: StencilRailContents = {
			...fullRail,
			documentCategoryIds: [],
			drawnCategoryId: "pin-a",
		};
		const onePinShown = scanHeights(pinsOnly).find(
			({ overflow }) => overflow.overflowedPinnedCategoryIds.length === 1,
		);
		expect(onePinShown?.overflow.shownPinnedCategoryIds).toEqual(["pin-a"]);
		const drawnLastPin = resolveStencilRailOverflow(onePinShown!.railHeight, {
			...pinsOnly,
			drawnCategoryId: "pin-b",
		});
		expect(drawnLastPin.shownPinnedCategoryIds).toEqual(["pin-b"]);
		expect(drawnLastPin.overflowedPinnedCategoryIds).toEqual(["pin-a"]);
	});

	it("folds the presets only once every category in '…' still does not fit, and lets the categories back", () => {
		const scan = scanHeights(fullRail);
		const firstCollapsedIndex = scan.findIndex(
			({ overflow }) => overflow.arePresetsCollapsed,
		);
		expect(firstCollapsedIndex).toBeGreaterThan(0);
		const lastUncollapsed = scan[firstCollapsedIndex - 1].overflow;
		expect(overflowedIdsOf(lastUncollapsed)).toEqual([
			"doc-most",
			"doc-least",
			"pin-a",
			"pin-b",
		]);
		const firstCollapsed = scan[firstCollapsedIndex].overflow;
		expect(overflowedIdsOf(firstCollapsed)).toEqual([]);
		// Folded for good below that height.
		for (const { overflow } of scan.slice(firstCollapsedIndex)) {
			expect(overflow.arePresetsCollapsed).toBe(true);
		}
	});

	it("never folds a single preset, which would free nothing", () => {
		for (const { overflow } of scanHeights({ ...fullRail, presetCount: 1 })) {
			expect(overflow.arePresetsCollapsed).toBe(false);
		}
	});

	it("draws each divider only with something on both sides, and the spacer only above a bottom button", () => {
		const noPresets = resolveStencilRailOverflow(800, {
			...fullRail,
			presetCount: 0,
			hasCatalogButton: false,
		});
		expect(noPresets.hasPinnedDivider).toBe(false);
		expect(noPresets.hasDocumentDivider).toBe(true);
		expect(noPresets.hasSpacer).toBe(false);
		const noCategories = resolveStencilRailOverflow(800, {
			...fullRail,
			pinnedCategoryIds: [],
			documentCategoryIds: [],
		});
		expect(noCategories.hasPinnedDivider).toBe(false);
		expect(noCategories.hasDocumentDivider).toBe(false);
		// Everything in "…": the spacer stays for the "…" button, the dividers go.
		const lastUncollapsed = scanHeights({
			...fullRail,
			hasCatalogButton: false,
		})
			.map(({ overflow }) => overflow)
			.filter((overflow) => !overflow.arePresetsCollapsed)
			.at(-1)!;
		expect(lastUncollapsed.hasMoreButton).toBe(true);
		expect(lastUncollapsed.hasSpacer).toBe(true);
		expect(lastUncollapsed.hasPinnedDivider).toBe(false);
		expect(lastUncollapsed.hasDocumentDivider).toBe(false);
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
