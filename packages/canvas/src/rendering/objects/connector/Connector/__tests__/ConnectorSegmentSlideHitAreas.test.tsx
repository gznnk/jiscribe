// @vitest-environment jsdom

import type { Point } from "@jiscribe/geometry";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { LINE_HIT_STROKE_WIDTH } from "../../../utils/hitStrokeWidth";
import { ConnectorSegmentSlideHitAreas } from "../ConnectorSegmentSlideHitAreas";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/** Renders the bands of `points` and returns them in document order. */
const renderBands = (
	points: readonly Point[],
	disablePointerEvents?: boolean,
): SVGRectElement[] => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	act(() =>
		root.render(
			<svg>
				<ConnectorSegmentSlideHitAreas
					id="line"
					points={points}
					disablePointerEvents={disablePointerEvents}
				/>
			</svg>,
		),
	);
	unmount = () => {
		act(() => root.unmount());
		container.remove();
	};
	return [...container.querySelectorAll("rect")];
};

const boxOf = (band: SVGRectElement) => ({
	x: Number(band.getAttribute("x")),
	y: Number(band.getAttribute("y")),
	width: Number(band.getAttribute("width")),
	height: Number(band.getAttribute("height")),
});

const HALF = LINE_HIT_STROKE_WIDTH / 2;

describe("ConnectorSegmentSlideHitAreas", () => {
	it("covers each axis-aligned segment with a band as wide as the line's hit area", () => {
		const bands = renderBands([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 80 },
		]);

		expect(bands.map(boxOf)).toEqual([
			{ x: 0, y: -HALF, width: 100, height: LINE_HIT_STROKE_WIDTH },
			{ x: 100 - HALF, y: 0, width: LINE_HIT_STROKE_WIDTH, height: 80 },
		]);
	});

	it("addresses each band at the connector by its index on the drawn path", () => {
		const bands = renderBands([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 80 },
		]);

		expect(
			bands.map((band) => [
				band.getAttribute("data-kind"),
				band.getAttribute("data-id"),
				band.getAttribute("data-action"),
			]),
		).toEqual([
			["connector", "line", "segment-slide:0"],
			["connector", "line", "segment-slide:1"],
		]);
	});

	it("spans a segment drawn right-to-left / bottom-to-top from its smaller end", () => {
		const bands = renderBands([
			{ x: 100, y: 80 },
			{ x: 100, y: 0 },
			{ x: 0, y: 0 },
		]);

		expect(bands.map(boxOf)).toEqual([
			{ x: 100 - HALF, y: 0, width: LINE_HIT_STROKE_WIDTH, height: 80 },
			{ x: 0, y: -HALF, width: 100, height: LINE_HIT_STROKE_WIDTH },
		]);
	});

	it("gives no band to a diagonal, a zero-length or a shorter-than-the-band segment, keeping the others' indices", () => {
		const bands = renderBands([
			{ x: 0, y: 0 },
			{ x: 50, y: 50 }, // 0: diagonal
			{ x: 50, y: 50 }, // 1: zero length
			{ x: 50 + LINE_HIT_STROKE_WIDTH - 1, y: 50 }, // 2: too short to aim at
			{ x: 50 + LINE_HIT_STROKE_WIDTH - 1, y: 150 }, // 3: kept
		]);

		expect(bands.map((band) => band.getAttribute("data-action"))).toEqual([
			"segment-slide:3",
		]);
	});

	it("keeps a segment exactly as long as the band is wide", () => {
		const bands = renderBands([
			{ x: 0, y: 0 },
			{ x: LINE_HIT_STROKE_WIDTH, y: 0 },
		]);

		expect(bands).toHaveLength(1);
	});

	it("draws nothing for a path of a single point", () => {
		expect(renderBands([{ x: 0, y: 0 }])).toEqual([]);
	});

	it("keeps its styling props off the DOM", () => {
		const [band] = renderBands(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			],
			true,
		);

		expect(band.hasAttribute("horizontal")).toBe(false);
		expect(band.hasAttribute("disablepointerevents")).toBe(false);
		expect(band.hasAttribute("disablePointerEvents")).toBe(false);
	});

	it("names the axis a segment slides along in its cursor, and takes fill hits", () => {
		const [horizontalBand, verticalBand] = renderBands([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 80 },
		]);

		expect(getComputedStyle(horizontalBand).cursor).toBe("ns-resize");
		expect(getComputedStyle(verticalBand).cursor).toBe("ew-resize");
		expect(getComputedStyle(horizontalBand).pointerEvents).toBe("fill");
	});

	it("takes no hits when pointer events are disabled (export / preview renders)", () => {
		const [band] = renderBands(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			],
			true,
		);

		expect(getComputedStyle(band).pointerEvents).toBe("none");
	});
});
