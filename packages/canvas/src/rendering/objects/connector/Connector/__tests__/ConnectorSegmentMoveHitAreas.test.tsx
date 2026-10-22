// @vitest-environment jsdom

import type { Point } from "@jiscribe/geometry";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { LINE_HIT_STROKE_WIDTH } from "../../../utils/hitStrokeWidth";
import { ConnectorSegmentMoveHitAreas } from "../ConnectorSegmentMoveHitAreas";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

type BandOptions = {
	sourceIsFree?: boolean;
	targetIsFree?: boolean;
	disablePointerEvents?: boolean;
};

/** Renders the bands of `points` and returns them in document order. */
const renderBands = (
	points: readonly Point[],
	{
		sourceIsFree = false,
		targetIsFree = false,
		disablePointerEvents,
	}: BandOptions = {},
): SVGLineElement[] => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);
	act(() =>
		root.render(
			<svg>
				<ConnectorSegmentMoveHitAreas
					id="line"
					points={points}
					sourceIsFree={sourceIsFree}
					targetIsFree={targetIsFree}
					disablePointerEvents={disablePointerEvents}
				/>
			</svg>,
		),
	);
	unmount = () => {
		act(() => root.unmount());
		container.remove();
	};
	return [...container.querySelectorAll("line")];
};

const actionsOf = (bands: SVGLineElement[]) =>
	bands.map((band) => band.getAttribute("data-action"));

// source → two vertices → target, every segment long enough to aim at.
const FOUR_POINT_PATH: readonly Point[] = [
	{ x: 0, y: 0 },
	{ x: 100, y: 40 },
	{ x: 200, y: 40 },
	{ x: 300, y: 0 },
];

describe("ConnectorSegmentMoveHitAreas", () => {
	it("bands only the segment between two vertices while both endpoints are owned", () => {
		const bands = renderBands(FOUR_POINT_PATH);

		expect(actionsOf(bands)).toEqual(["segment-move:1"]);
		const [band] = bands;
		expect(
			["x1", "y1", "x2", "y2"].map((name) => band.getAttribute(name)),
		).toEqual(["100", "40", "200", "40"]);
		expect(band.getAttribute("data-kind")).toBe("connector");
		expect(band.getAttribute("data-id")).toBe("line");
	});

	it("also bands the segment next to a free endpoint", () => {
		expect(
			actionsOf(renderBands(FOUR_POINT_PATH, { sourceIsFree: true })),
		).toEqual(["segment-move:0", "segment-move:1"]);
		expect(
			actionsOf(renderBands(FOUR_POINT_PATH, { targetIsFree: true })),
		).toEqual(["segment-move:1", "segment-move:2"]);
	});

	it("bands nothing on a two-point line with an owned end", () => {
		const twoPoints = [
			{ x: 0, y: 0 },
			{ x: 300, y: 0 },
		];

		expect(renderBands(twoPoints, { sourceIsFree: true })).toEqual([]);
		expect(renderBands(twoPoints, { targetIsFree: true })).toEqual([]);
	});

	it("gives no band to a movable segment shorter than the band is wide, at any angle", () => {
		const shortSide = (LINE_HIT_STROKE_WIDTH - 1) / Math.SQRT2;
		const bands = renderBands([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100 + shortSide, y: shortSide },
			{ x: 300, y: 0 },
		]);

		expect(bands).toEqual([]);
	});

	it("keeps a diagonal segment exactly as long as the band is wide", () => {
		const side = LINE_HIT_STROKE_WIDTH / Math.SQRT2;
		const bands = renderBands([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			// Rounded up so floating point cannot pull the length below the floor.
			{ x: 100 + side + 1e-9, y: side + 1e-9 },
			{ x: 300, y: 0 },
		]);

		expect(actionsOf(bands)).toEqual(["segment-move:1"]);
	});

	it("keeps its styling props off the DOM", () => {
		const [band] = renderBands(FOUR_POINT_PATH, { disablePointerEvents: true });

		expect(band.hasAttribute("disablepointerevents")).toBe(false);
		expect(band.hasAttribute("disablePointerEvents")).toBe(false);
	});

	it("takes stroke hits under the move cursor, and none when pointer events are disabled", () => {
		const [liveBand] = renderBands(FOUR_POINT_PATH);
		expect(getComputedStyle(liveBand).cursor).toBe("move");
		expect(getComputedStyle(liveBand).pointerEvents).toBe("stroke");
		unmount?.();
		unmount = null;

		const [disabledBand] = renderBands(FOUR_POINT_PATH, {
			disablePointerEvents: true,
		});
		expect(getComputedStyle(disabledBand).pointerEvents).toBe("none");
	});
});
