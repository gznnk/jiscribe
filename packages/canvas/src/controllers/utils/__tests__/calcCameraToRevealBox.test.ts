import type { BoundingBox } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../states/canvas/Viewport";
import { calcCameraToRevealBox } from "../calcCameraToRevealBox";

/** Visible world rect (0, 0)-(400, 300) at zoom 1. */
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 400,
	height: 300,
	zoom: 1,
};

const box = (
	left: number,
	top: number,
	right: number,
	bottom: number,
): BoundingBox => ({ left, top, right, bottom });

describe("calcCameraToRevealBox", () => {
	it("returns null when the box already fits inside the visible rect", () => {
		expect(calcCameraToRevealBox(viewport, box(50, 50, 150, 120))).toBeNull();
	});

	it("returns null when the box touches the edges exactly", () => {
		expect(calcCameraToRevealBox(viewport, box(0, 0, 400, 300))).toBeNull();
	});

	it("pans left to reveal a box off the left edge", () => {
		expect(calcCameraToRevealBox(viewport, box(-30, 50, 70, 120))).toEqual({
			minX: -30,
			minY: 0,
			zoom: 1,
		});
	});

	it("pans up to reveal a box off the top edge", () => {
		expect(calcCameraToRevealBox(viewport, box(50, -40, 150, 60))).toEqual({
			minX: 0,
			minY: -40,
			zoom: 1,
		});
	});

	it("pans right to reveal a box off the right edge", () => {
		// The right edge at 460 has to land on the visible right edge: 460 - 400.
		expect(calcCameraToRevealBox(viewport, box(360, 50, 460, 120))).toEqual({
			minX: 60,
			minY: 0,
			zoom: 1,
		});
	});

	it("pans down to reveal a box off the bottom edge", () => {
		expect(calcCameraToRevealBox(viewport, box(50, 250, 150, 340))).toEqual({
			minX: 0,
			minY: 40,
			zoom: 1,
		});
	});

	it("pans on both axes at once", () => {
		expect(calcCameraToRevealBox(viewport, box(-30, 250, 70, 340))).toEqual({
			minX: -30,
			minY: 40,
			zoom: 1,
		});
	});

	it("stays put on an axis whose visible span lies inside a larger box", () => {
		// 600x500 box holding the whole visible rect: the target is already being
		// looked at, so a shape bigger than the viewport must not drag the camera.
		expect(
			calcCameraToRevealBox(viewport, box(-100, -100, 500, 400)),
		).toBeNull();
	});

	it("pulls to the near end of a box larger than the visible rect", () => {
		// The visible rect sits past the box on both axes, so each axis moves the
		// least it can: onto the box's right edge and its bottom edge.
		const panned: Viewport = { ...viewport, minX: 700, minY: 600 };

		expect(calcCameraToRevealBox(panned, box(0, 0, 600, 500))).toEqual({
			minX: 200,
			minY: 200,
			zoom: 1,
		});
	});

	it("pulls to the leading end when the box starts past the visible rect", () => {
		expect(calcCameraToRevealBox(viewport, box(100, 80, 800, 700))).toEqual({
			minX: 100,
			minY: 80,
			zoom: 1,
		});
	});

	it("stays put on the axis that fits inside the box and pans on the other", () => {
		// X: the 600-wide box holds the visible span, so it is left alone.
		// Y: the 90-tall box fits and is off the bottom edge, so it is revealed.
		expect(calcCameraToRevealBox(viewport, box(-100, 250, 500, 340))).toEqual({
			minX: 0,
			minY: 40,
			zoom: 1,
		});
	});

	it("never changes the zoom", () => {
		// zoom 2 halves the visible world rect to 200x150.
		const zoomed: Viewport = { ...viewport, zoom: 2 };
		const camera = calcCameraToRevealBox(zoomed, box(150, 20, 250, 80));

		expect(camera).toEqual({ minX: 50, minY: 0, zoom: 2 });
	});

	it("reveals against the world rect scaled by the zoom", () => {
		// At zoom 0.5 the visible world rect is 800x600, so the same box fits.
		const zoomedOut: Viewport = { ...viewport, zoom: 0.5 };

		expect(calcCameraToRevealBox(zoomedOut, box(150, 20, 250, 80))).toBeNull();
	});

	it("converts the padding from screen px to world units", () => {
		// 20 screen px at zoom 2 is 10 world units, so a box ending exactly on the
		// visible right edge (200) still has to pan by that margin.
		const zoomed: Viewport = { ...viewport, zoom: 2 };

		expect(calcCameraToRevealBox(zoomed, box(100, 20, 200, 80), 20)).toEqual({
			minX: 10,
			minY: 0,
			zoom: 2,
		});
	});

	it("leaves the padding as empty margin around a revealed box", () => {
		expect(calcCameraToRevealBox(viewport, box(-30, 50, 70, 120), 24)).toEqual({
			minX: -54,
			minY: 0,
			zoom: 1,
		});
	});

	it("returns null when the padded box still fits", () => {
		expect(
			calcCameraToRevealBox(viewport, box(30, 30, 370, 270), 24),
		).toBeNull();
	});

	it("returns null for a viewport that has not been measured yet", () => {
		const unmeasured: Viewport = { ...viewport, width: 0, height: 0 };

		expect(calcCameraToRevealBox(unmeasured, box(-30, -30, 70, 70))).toBeNull();
	});
});
