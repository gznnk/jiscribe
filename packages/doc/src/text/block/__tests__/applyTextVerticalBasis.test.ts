import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { applyTextVerticalBasis } from "../applyTextVerticalBasis";

/** A shape 120 wide and 100 tall, the size every case below is measured at. */
const SHAPE = { width: 120, height: 100 };

/** The whole box of {@link SHAPE}, which a type declaring no inset gets. */
const WHOLE_BOX: Rect = { x: -60, y: -50, width: 120, height: 100 };

/**
 * A cylinder's region: clear of the top cap (twice the cap radius, the far side
 * of the ellipse included) and of the bottom bulge — the asymmetry the frame
 * basis exists to cancel.
 */
const CYLINDER_REGION: Rect = { x: -60, y: -26, width: 120, height: 64 };

describe("applyTextVerticalBasis", () => {
	it("hands back the declared region itself for the region basis", () => {
		expect(applyTextVerticalBasis(CYLINDER_REGION, SHAPE, "region")).toBe(
			CYLINDER_REGION,
		);
	});

	it("hands back the declared region itself when no basis is set", () => {
		expect(applyTextVerticalBasis(CYLINDER_REGION, SHAPE, undefined)).toBe(
			CYLINDER_REGION,
		);
	});

	it("spans the whole height for the frame basis, keeping the region's width", () => {
		expect(applyTextVerticalBasis(CYLINDER_REGION, SHAPE, "frame")).toEqual({
			x: -60,
			y: -50,
			width: 120,
			height: 100,
		});
	});

	it("leaves a stadium's horizontal caps in place, cutting only the vertical inset", () => {
		const stadiumRegion: Rect = { x: -35, y: -40, width: 70, height: 80 };
		expect(applyTextVerticalBasis(stadiumRegion, SHAPE, "frame")).toEqual({
			x: -35,
			y: -50,
			width: 70,
			height: 100,
		});
	});

	it("changes nothing about a region that already is the whole box", () => {
		expect(applyTextVerticalBasis(WHOLE_BOX, SHAPE, "frame")).toEqual(
			WHOLE_BOX,
		);
	});

	it("centres the frame box on the shape, so both bases share a centre when the region is symmetric", () => {
		const symmetricRegion: Rect = { x: -50, y: -40, width: 100, height: 80 };
		const framed = applyTextVerticalBasis(symmetricRegion, SHAPE, "frame");
		expect(framed.y + framed.height / 2).toBe(
			symmetricRegion.y + symmetricRegion.height / 2,
		);
	});

	it("keeps a flipped shape's negative region width as it is", () => {
		const flipped: Rect = { x: 60, y: -26, width: -120, height: 64 };
		expect(applyTextVerticalBasis(flipped, SHAPE, "frame")).toEqual({
			x: 60,
			y: -50,
			width: -120,
			height: 100,
		});
	});
});
