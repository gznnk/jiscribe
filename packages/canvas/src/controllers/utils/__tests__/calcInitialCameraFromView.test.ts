import type { BoundingBox } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { ZOOM } from "../../../constants/zoom";
import { calcInitialCameraFromView } from "../calcInitialCameraFromView";

const limits = { min: ZOOM.MIN, max: ZOOM.MAX };

/** 800 x 400 of content starting at the origin. */
const bounds: BoundingBox = { left: 0, top: 0, right: 800, bottom: 400 };

const viewport = { width: 1000, height: 500 };

describe("calcInitialCameraFromView", () => {
	describe("fit-width", () => {
		it("makes the padded width exactly fill the viewport", () => {
			const camera = calcInitialCameraFromView(
				bounds,
				undefined,
				"fit-width",
				viewport,
				limits,
			);
			// 1000 / 800
			expect(camera).toEqual({ zoom: 1.25, minX: 0, minY: 0 });
		});

		it("counts the horizontal padding into the width being fitted", () => {
			const camera = calcInitialCameraFromView(
				bounds,
				{ left: 100, right: 100 },
				"fit-width",
				viewport,
				limits,
			);
			// Padded width is 1000, so it fits at 1:1 and starts at the padded left edge.
			expect(camera).toEqual({ zoom: 1, minX: -100, minY: 0 });
		});

		it("starts at the padded top edge, the axis it did not fit", () => {
			const camera = calcInitialCameraFromView(
				bounds,
				{ top: 48, bottom: 999 },
				"fit-width",
				viewport,
				limits,
			);
			expect(camera?.minY).toBe(-48);
			// The bottom padding is outside the fitted axis, so it changes nothing here.
			expect(camera?.zoom).toBe(1.25);
		});

		it("keeps the content offset when the drawing does not start at the origin", () => {
			const camera = calcInitialCameraFromView(
				{ left: 200, top: -50, right: 1000, bottom: 350 },
				{ top: 10, left: 20, right: 20 },
				"fit-width",
				viewport,
				limits,
			);
			// Padded width 840 -> 1000 / 840
			expect(camera).toEqual({ zoom: 1.1905, minX: 180, minY: -60 });
		});
	});

	describe("fit-all", () => {
		it("fits the tighter axis and centers the padded box on both", () => {
			const camera = calcInitialCameraFromView(
				bounds,
				undefined,
				"fit-all",
				viewport,
				limits,
			);
			// min(1000/800, 500/400) = 1.25 on both axes, so both fill exactly.
			expect(camera).toEqual({ zoom: 1.25, minX: 0, minY: 0 });
		});

		it("centers the axis that has slack", () => {
			const camera = calcInitialCameraFromView(
				{ left: 0, top: 0, right: 800, bottom: 200 },
				undefined,
				"fit-all",
				viewport,
				limits,
			);
			// Width is the tighter axis (1.25); at that zoom the viewport shows 400
			// world px of height around a 200-tall box.
			expect(camera).toEqual({ zoom: 1.25, minX: 0, minY: -100 });
		});

		it("counts padding on both axes", () => {
			const camera = calcInitialCameraFromView(
				bounds,
				{ top: 50, right: 100, bottom: 50, left: 100 },
				"fit-all",
				viewport,
				limits,
			);
			// Padded box is 1000 x 500 from (-100, -50): an exact fit at 1:1.
			expect(camera).toEqual({ zoom: 1, minX: -100, minY: -50 });
		});
	});

	describe("zoom clamping", () => {
		it("clamps a tiny drawing to the canvas maximum and keeps it centered", () => {
			const camera = calcInitialCameraFromView(
				{ left: 0, top: 0, right: 1, bottom: 1 },
				undefined,
				"fit-all",
				viewport,
				limits,
			);
			expect(camera?.zoom).toBe(ZOOM.MAX);
			// Centered: 1000 screen px at zoom 10 is 100 world px around the 0..1 box.
			expect(camera?.minX).toBe(-49.5);
			expect(camera?.minY).toBe(-24.5);
		});

		it("clamps a huge drawing to the canvas minimum", () => {
			const camera = calcInitialCameraFromView(
				{ left: 0, top: 0, right: 1_000_000, bottom: 1_000_000 },
				undefined,
				"fit-all",
				viewport,
				limits,
			);
			expect(camera?.zoom).toBe(ZOOM.MIN);
		});

		it("honors limits narrower than the canvas defaults", () => {
			const camera = calcInitialCameraFromView(
				bounds,
				undefined,
				"fit-width",
				viewport,
				{ min: 0.5, max: 1 },
			);
			expect(camera?.zoom).toBe(1);
		});
	});

	describe("nothing to fit", () => {
		it("returns null for a viewport with no extent", () => {
			expect(
				calcInitialCameraFromView(
					bounds,
					undefined,
					"fit-all",
					{ width: 0, height: 500 },
					limits,
				),
			).toBeNull();
		});

		it("returns null when the fitted axis has no extent", () => {
			// A purely vertical drawing under fit-width: no width to fit, and
			// falling back to the height would silently be a different framing.
			expect(
				calcInitialCameraFromView(
					{ left: 100, top: 0, right: 100, bottom: 400 },
					undefined,
					"fit-width",
					viewport,
					limits,
				),
			).toBeNull();
		});

		it("still fits a vertical drawing whose horizontal padding gives it width", () => {
			const camera = calcInitialCameraFromView(
				{ left: 100, top: 0, right: 100, bottom: 400 },
				{ left: 250, right: 250 },
				"fit-width",
				viewport,
				limits,
			);
			expect(camera).toEqual({ zoom: 2, minX: -150, minY: 0 });
		});

		it("fits the other axis under fit-all when one is degenerate", () => {
			const camera = calcInitialCameraFromView(
				{ left: 0, top: 0, right: 800, bottom: 0 },
				undefined,
				"fit-all",
				viewport,
				limits,
			);
			expect(camera?.zoom).toBe(1.25);
		});
	});

	it("rounds the zoom to the canvas's precision without shifting the framing", () => {
		const camera = calcInitialCameraFromView(
			{ left: 0, top: 0, right: 700, bottom: 300 },
			undefined,
			"fit-width",
			viewport,
			limits,
		);
		// 1000 / 700 = 1.428571... -> 4 decimal places
		expect(camera?.zoom).toBe(1.4286);
		// The offsets come from the unrounded zoom, so the left edge stays exact.
		expect(camera?.minX).toBe(0);
	});
});
