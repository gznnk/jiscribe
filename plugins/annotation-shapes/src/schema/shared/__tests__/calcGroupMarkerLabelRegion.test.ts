import { calcLabelTextVisualBounds } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { calcGroupMarkerLabelRegion } from "../calcGroupMarkerLabelRegion";
import type { GroupMarkerDirection } from "../GroupMarkerFields";
import { GROUP_MARKER_LABEL_GAP } from "../GroupMarkerFields";
import { calcGroupMarkerTip } from "../groupMarkerGeometry";

const boxOf = (direction: GroupMarkerDirection, width = 24, height = 160) => ({
	width,
	height,
	direction,
	tipPosition: 0.5,
});

/** The label region of a marker labelled `text`, measured with no type defaults. */
const regionOf = (box: ReturnType<typeof boxOf>, text: string) =>
	calcGroupMarkerLabelRegion(box, { text }, undefined);

/** The tip in the same local coordinates the region is returned in. */
const tipOf = (box: ReturnType<typeof boxOf>) =>
	calcGroupMarkerTip(
		-box.width / 2,
		-box.height / 2,
		box.width,
		box.height,
		box.direction,
		box.tipPosition,
	);

describe("calcGroupMarkerLabelRegion", () => {
	it("sets the label beyond the tip and centers it there (left)", () => {
		const box = boxOf("left");
		const region = regionOf(box, "doc layer");
		const tip = tipOf(box);
		expect(region.x + region.width).toBe(tip.x - GROUP_MARKER_LABEL_GAP);
		expect(region.y + region.height / 2).toBe(tip.y);
	});

	it("mirrors that for the opposite direction (right)", () => {
		const box = boxOf("right");
		const region = regionOf(box, "doc layer");
		const tip = tipOf(box);
		expect(region.x).toBe(tip.x + GROUP_MARKER_LABEL_GAP);
		expect(region.y + region.height / 2).toBe(tip.y);
	});

	it("hangs the label below the tip for a down marker", () => {
		const box = boxOf("down", 300, 30);
		const region = regionOf(box, "one transaction");
		const tip = tipOf(box);
		expect(region.y).toBe(tip.y + GROUP_MARKER_LABEL_GAP);
		expect(region.x + region.width / 2).toBe(tip.x);
	});

	it("grows with the text rather than with the box", () => {
		const short = regionOf(boxOf("left"), "a");
		const long = regionOf(boxOf("left"), "a".repeat(40));
		expect(long.width).toBeGreaterThan(short.width);

		const wideBox = regionOf(boxOf("left", 96, 160), "a");
		expect(wideBox.width).toBe(short.width);
	});

	it("runs sideways rather than wrapping, however long the label is", () => {
		const oneLine = regionOf(boxOf("left"), "a");
		const long = regionOf(boxOf("left"), "a".repeat(400));
		expect(long.width).toBeGreaterThan(240);
		expect(long.height).toBeCloseTo(oneLine.height);
	});

	it("reserves a line per authored newline instead", () => {
		const oneLine = regionOf(boxOf("left"), "doc layer");
		const twoLines = regionOf(boxOf("left"), "doc\nlayer");
		expect(twoLines.height).toBeGreaterThan(oneLine.height);
	});

	it("measures the label in the type's own body defaults", () => {
		const plain = regionOf(boxOf("left"), "doc layer");
		const larger = calcGroupMarkerLabelRegion(
			boxOf("left"),
			{ text: "doc layer" },
			{ fontSize: 30 },
		);
		expect(larger.height).toBeGreaterThan(plain.height);
	});

	/**
	 * A marker with no movable tip (the plain bracket) carries no `tipPosition`
	 * at all, and must land on the middle of its span rather than on an end.
	 */
	it("anchors a marker without a tipPosition to the middle of the span", () => {
		const withoutTipPosition = {
			width: 24,
			height: 160,
			direction: "left" as const,
		};
		expect(
			calcGroupMarkerLabelRegion(
				withoutTipPosition,
				{ text: "doc layer" },
				undefined,
			),
		).toEqual(regionOf(boxOf("left"), "doc layer"));
	});
});

describe("calcGroupMarkerLabelRegion as a label region the visual bounds widen by", () => {
	it("reserves nothing beside the marker while the label is empty", () => {
		expect(
			calcLabelTextVisualBounds(
				boxOf("left"),
				{ text: "" },
				undefined,
				calcGroupMarkerLabelRegion,
			),
		).toEqual({ x: -12, y: -80, width: 24, height: 160 });
	});

	it("widens towards the tip once the label has text", () => {
		const box = boxOf("left");
		const bounds = calcLabelTextVisualBounds(
			box,
			{ text: "doc layer" },
			undefined,
			calcGroupMarkerLabelRegion,
		);
		const region = regionOf(box, "doc layer");
		expect(bounds.x).toBe(region.x);
		// Summed from a measured label width, so the right edge lands on the marker's
		// own edge only to within float error.
		expect(bounds.x + bounds.width).toBeCloseTo(box.width / 2);
	});
});
