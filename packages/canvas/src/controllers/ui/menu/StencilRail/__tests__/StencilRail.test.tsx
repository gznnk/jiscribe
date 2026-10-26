// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { RectIcon } from "../../../objects/primitives/RectIcon";
import type { StencilCategory } from "../../../objects/StencilCategory";
import { resolveStencilCategories } from "../../StencilLibrary/utils/resolveStencilCategory";
import { StencilRail } from "../StencilRail";
import { resolveStencilRailOverflow } from "../utils/resolveStencilRailOverflow";

/**
 * Where the rail draws a pin drag's insertion line: only beside a pin that is
 * on screen, so a drop landing among the pins of a closed "…" popover is
 * marked after the rail's last pin.
 */

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const categoryOf = (id: string, presetIds: string[]): StencilCategory => ({
	id,
	label: id,
	icon: RectIcon,
	presetIds,
});

const { stencil } = createCanvasRegistries();
const librarySections = resolveStencilCategories(
	[
		categoryOf("boxes", ["rect"]),
		categoryOf("rounds", ["ellipse"]),
		categoryOf("lines", ["polyline"]),
		categoryOf("shapes", ["polygon"]),
	],
	stencil,
);
const PINNED_CATEGORY_IDS = ["boxes", "rounds", "lines", "shapes"];
const PRESET_IDS = ["text"];

/** A rail height at which two pins are shown and two are in "…", found with the resolver itself. */
const twoShownHeight = (() => {
	for (let railHeight = 600; railHeight > 0; railHeight--) {
		const overflow = resolveStencilRailOverflow(railHeight, {
			presetCount: PRESET_IDS.length,
			hasCatalogButton: true,
			pinnedCategoryIds: PINNED_CATEGORY_IDS,
			drawnCategoryId: null,
		});
		if (overflow.shownPinnedCategoryIds.length === 2) {
			return railHeight;
		}
	}
	throw new Error("no height shows exactly two pins");
})();

beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
});

const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
let unmount: (() => void) | null = null;
afterEach(() => {
	unmount?.();
	unmount = null;
	Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

const renderRail = (
	openRailPopover: "railOverflow" | null,
	pinInsertionIndex: number,
) => {
	Element.prototype.getBoundingClientRect = function (this: Element) {
		return (
			this.matches('[data-id="stencil-rail"]')
				? { width: 48, height: twoShownHeight }
				: originalGetBoundingClientRect.call(this)
		) as DOMRect;
	};
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<StencilRail
				presetIds={PRESET_IDS}
				librarySections={librarySections}
				pinnedCategoryIds={PINNED_CATEGORY_IDS}
				activePresetId={null}
				drawnPanelContent={null}
				openRailPopover={openRailPopover}
				pinInsertionIndex={pinInsertionIndex}
				onRailPopoverUnshowable={() => {}}
			/>,
		),
	);
	unmount = () => act(() => root.unmount());
	return container;
};

const marksOf = (container: HTMLElement) =>
	[...container.querySelectorAll("[data-pin-insertion]")].map(
		(element) =>
			`${element.getAttribute("data-action")}:${element.getAttribute("data-pin-insertion")}`,
	);

describe("StencilRail pin insertion line", () => {
	it("marks after the rail's last pin a drop landing in a closed '…' popover", () => {
		expect(marksOf(renderRail(null, 2))).toEqual(["toggle:rounds:after"]);
	});

	it("marks the popover's row while the popover is shown", () => {
		expect(marksOf(renderRail("railOverflow", 2))).toEqual([
			"toggle:lines:before",
		]);
	});
});
