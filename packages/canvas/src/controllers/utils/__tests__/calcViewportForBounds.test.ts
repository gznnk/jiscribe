import { describe, expect, it } from "vitest";

import { ZOOM } from "../../../constants/zoom";
import { calcViewportForBounds } from "../calcViewportForBounds";

describe("calcViewportForBounds", () => {
	it("fits the content centered with the requested padding", () => {
		// Content 100x100 centered at (100, 100); viewport 296x296 with padding 48
		// leaves 200x200 available -> zoom 2.
		const viewport = calcViewportForBounds(
			{ left: 50, top: 50, right: 150, bottom: 150 },
			{ width: 296, height: 296, padding: 48 },
		);

		expect(viewport).toEqual({
			width: 296,
			height: 296,
			zoom: 2,
			minX: 100 - 296 / (2 * 2),
			minY: 100 - 296 / (2 * 2),
		});
	});

	it("uses the more constrained axis for the zoom", () => {
		// Content 400x100; viewport 296x296, padding 48 -> available 200x200.
		// Width axis: 0.5, height axis: 2 -> zoom 0.5.
		const viewport = calcViewportForBounds(
			{ left: 0, top: 0, right: 400, bottom: 100 },
			{ width: 296, height: 296, padding: 48 },
		);

		expect(viewport?.zoom).toBe(0.5);
	});

	it("clamps the zoom to ZOOM.MAX for tiny content", () => {
		const viewport = calcViewportForBounds(
			{ left: 0, top: 0, right: 1, bottom: 1 },
			{ width: 1000, height: 1000, padding: 48 },
		);

		expect(viewport?.zoom).toBe(ZOOM.MAX);
	});

	it("clamps the zoom to ZOOM.MIN for huge content", () => {
		const viewport = calcViewportForBounds(
			{ left: 0, top: 0, right: 1_000_000, bottom: 1_000_000 },
			{ width: 1000, height: 1000, padding: 48 },
		);

		expect(viewport?.zoom).toBe(ZOOM.MIN);
	});

	it("fits a horizontal line (height 0) along the valid axis", () => {
		// Height is degenerate; only the width axis drives the zoom.
		const viewport = calcViewportForBounds(
			{ left: 0, top: 100, right: 400, bottom: 100 },
			{ width: 296, height: 296, padding: 48 },
		);

		expect(viewport?.zoom).toBe(0.5);
	});

	it("returns null when both axes are degenerate", () => {
		const viewport = calcViewportForBounds(
			{ left: 100, top: 100, right: 100, bottom: 100 },
			{ width: 296, height: 296, padding: 48 },
		);

		expect(viewport).toBeNull();
	});
});
