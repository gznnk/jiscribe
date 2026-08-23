import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";
import { resolveViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import { convertRectToBoundingBox } from "@jiscribe/geometry";
import type { BoundingBox } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { ZOOM } from "../../../constants/zoom";
import type { ObjectVisualBoundsRegistry } from "../../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { calcContentBounds } from "../calcContentBounds";
import { calcInitialCameraFromView } from "../calcInitialCameraFromView";
import { calcScrollBounds } from "../calcScrollBounds";
import { calcVisibleWorldRect } from "../calcVisibleWorldRect";
import { resolveExportOptions } from "../resolveExportOptions";
import { resolveScrollWallPadding } from "../resolveScrollWallPadding";

/**
 * The one rectangle `view.padding` is supposed to mean, checked across the three
 * places that each derive it for themselves.
 *
 * Every JSDoc around `view` claims the same thing — the box a document is opened
 * at is the box it is walled in at is the box it is exported at — but each
 * consumer computes it from `calcContentBounds` + `resolveViewPadding` on its
 * own, and nothing compares the three. So a change to any one of them (a stray
 * default margin, a padding read on one axis only, a bounds call that forgets
 * the visual bounds) leaves the other two right and every existing test green.
 *
 * These compare the three results against each other rather than against
 * hand-written numbers: the numbers are asserted once, on the box the fixture's
 * padding implies, and the rest is parity.
 */

const registries = createTestRegistries();

/** No shape draws outside its geometry box; the padded box is the geometry one. */
const geometryOnlyVisualBounds: Pick<ObjectVisualBoundsRegistry, "get"> = {
	get: () => undefined,
};

/**
 * Stands in for a type drawing a 10px-tall strip below its box — the case the
 * three consumers only agree on because they all pass the same registry down.
 */
const stripBelowBoxVisualBounds: Pick<ObjectVisualBoundsRegistry, "get"> = {
	get: () => (state) => ({
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: state.height + 10,
	}),
};

/** Content spanning 0,0..400,240, so every side of the padding lands on a different edge. */
const twoRectsDocWith = (view: ViewDoc): CanvasDoc =>
	({
		version: 1,
		view,
		root: [
			{ id: "rect-1", type: "rect", x: 0, y: 0, width: 100, height: 60 },
			{ id: "rect-2", type: "rect", x: 300, y: 200, width: 100, height: 40 },
		],
	}) as unknown as CanvasDoc;

/** Deliberately different on all four sides: a consumer reading one side for another shows up. */
const pagePadding = { top: 10, right: 20, bottom: 30, left: 40 };

const view: ViewDoc = {
	padding: pagePadding,
	open: "fit-all",
	scroll: "content",
};

/** The content extent grown by the declared padding — what all three must come to. */
const calcPaddedBox = (
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">,
	objects: Parameters<typeof calcContentBounds>[0],
): BoundingBox => {
	const bounds = calcContentBounds(objects, visualBounds);
	if (bounds === null) {
		throw new Error("the fixture has no content to measure");
	}
	const padding = resolveViewPadding(pagePadding);
	return {
		left: bounds.left - padding.left,
		top: bounds.top - padding.top,
		right: bounds.right + padding.right,
		bottom: bounds.bottom + padding.bottom,
	};
};

/**
 * The three rectangles, measured over one document with one registry.
 *
 * The viewport handed to the framing is the padded box itself, so the camera's
 * visible world rect *is* the box it framed: `"fit-all"` centers on an axis with
 * slack, and comparing a centered frame with a wall would be comparing the
 * viewport's aspect ratio rather than the padding.
 */
const measureThreeWays = (
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">,
) => {
	const state = canvasToState(
		twoRectsDocWith(view),
		registries.objectMapper,
		registries.objectContentResizer,
	);
	const paddedBox = calcPaddedBox(visualBounds, state.objects);
	const viewportSize = {
		width: paddedBox.right - paddedBox.left,
		height: paddedBox.bottom - paddedBox.top,
	};

	const bounds = calcContentBounds(state.objects, visualBounds);
	if (bounds === null) {
		throw new Error("the fixture has no content to measure");
	}
	const camera = calcInitialCameraFromView(
		bounds,
		state.view?.padding,
		"fit-all",
		viewportSize,
		{ min: ZOOM.MIN, max: ZOOM.MAX },
	);
	if (camera === null) {
		throw new Error("the fixture declares a framing but none was computed");
	}

	const exportViewBox = resolveExportOptions(
		{ ...state, viewport: { ...viewportSize, ...camera } },
		registries.objectMapper,
		visualBounds,
		{ includeSource: false },
	).viewBox;
	if (exportViewBox === undefined) {
		throw new Error("the fixture has no content, so nothing was framed");
	}

	return {
		paddedBox,
		/** What the opened camera actually shows. */
		framed: convertRectToBoundingBox(
			calcVisibleWorldRect({ ...viewportSize, ...camera }),
		),
		/** The rect panning is walled in at. */
		wall: calcScrollBounds(
			resolveScrollWallPadding(null, state.view),
			state.objects,
			visualBounds,
		),
		/** The world rect the exported image covers. */
		exported: convertRectToBoundingBox(exportViewBox),
	};
};

describe("the box view.padding names, across its three consumers", () => {
	describe("over the geometry boxes alone", () => {
		const measured = measureThreeWays(geometryOnlyVisualBounds);

		it("grows each side of the content by the padding declared for it", () => {
			// Content 0,0..400,240 with top 10 / right 20 / bottom 30 / left 40.
			expect(measured.paddedBox).toEqual({
				left: -40,
				top: -10,
				right: 420,
				bottom: 270,
			});
		});

		it("opens the view on exactly that box", () => {
			expect(measured.framed).toEqual(measured.paddedBox);
		});

		it("walls panning in at exactly that box", () => {
			expect(measured.wall).toEqual(measured.paddedBox);
		});

		it("exports exactly that box", () => {
			expect(measured.exported).toEqual(measured.paddedBox);
		});

		it("leaves the three agreeing with each other, not merely with the box", () => {
			expect(measured.framed).toEqual(measured.wall);
			expect(measured.wall).toEqual(measured.exported);
		});
	});

	describe("with a type drawing outside its geometry box", () => {
		const measured = measureThreeWays(stripBelowBoxVisualBounds);

		it("counts the strip into the box, so the padding starts outside the ink", () => {
			// The strip pushes the lowest shape's bottom from 240 to 250.
			expect(measured.paddedBox).toEqual({
				left: -40,
				top: -10,
				right: 420,
				bottom: 280,
			});
		});

		it("keeps the three on the widened box together", () => {
			expect(measured.framed).toEqual(measured.paddedBox);
			expect(measured.wall).toEqual(measured.paddedBox);
			expect(measured.exported).toEqual(measured.paddedBox);
		});
	});
});
