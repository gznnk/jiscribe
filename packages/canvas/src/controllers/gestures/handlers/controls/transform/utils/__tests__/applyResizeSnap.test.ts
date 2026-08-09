import type { TransformedFrame } from "@jiscribe/geometry";
import { calcFrameKeyPoints } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import type { TransformState } from "../../../../../../../states/objects/base/TransformState";
import type {
	SnapCandidate,
	SnapCandidates,
	SnapEdge,
} from "../../../../../../CanvasTypes";
import type { TransformAnchorType } from "../../TransformAnchorType";
import { applyResizeSnap } from "../applyResizeSnap";
import { calcAnchorResize } from "../calcAnchorResize";

/**
 * Base frame: 100x50, centered at (50, 25), unrotated.
 * World-space bounding box: left 0, right 100, top 0, bottom 50.
 */
const startFrame: TransformedFrame & TransformState = {
	cx: 50,
	cy: 25,
	width: 100,
	height: 50,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

const startFrameKeyPoints = calcFrameKeyPoints(startFrame);

const makeCandidate = (
	objectId: string,
	coordinate: number,
	edge: SnapEdge,
): SnapCandidate => ({
	objectId,
	coordinate,
	edge,
	perpendicularMin: 0,
	perpendicularMax: 200,
});

const NO_CANDIDATES: SnapCandidates = { x: [], y: [] };

/** Runs calcAnchorResize at the cursor and applies snap correction to the result. */
const snapResizeAt = (
	anchorType: TransformAnchorType,
	cursorX: number,
	cursorY: number,
	options: {
		snapCandidates?: SnapCandidates;
		excludeIds?: ReadonlySet<string>;
		zoom?: number;
	} = {},
) => {
	const resizeResult = calcAnchorResize(
		anchorType,
		startFrame,
		cursorX,
		cursorY,
		startFrameKeyPoints,
		0,
		undefined,
		false,
	);
	if (!resizeResult) {
		throw new Error(`not a resize anchor: ${anchorType}`);
	}
	return applyResizeSnap({
		anchorType,
		startFrame,
		cursorX,
		cursorY,
		startFrameKeyPoints,
		radians: 0,
		aspectRatio: undefined,
		doKeepProportion: false,
		resizeResult,
		snapCandidates: options.snapCandidates ?? NO_CANDIDATES,
		excludeIds: options.excludeIds ?? new Set(),
		zoom: options.zoom ?? 1,
	});
};

describe("applyResizeSnap", () => {
	describe("edge anchor (X axis)", () => {
		it("snaps the dragged right edge to a candidate within the threshold", () => {
			// Dragging rightCenter to x=147 puts the right edge 3px from the candidate at 150
			const { resizeResult, snapFeedback } = snapResizeAt(
				"rightCenter",
				147,
				25,
				{
					snapCandidates: { x: [makeCandidate("other", 150, "right")], y: [] },
				},
			);

			// The right edge lands exactly on the candidate; the left edge stays fixed at 0
			expect(resizeResult.width).toBeCloseTo(150);
			expect(resizeResult.inversedCenterX).toBeCloseTo(25);

			// A vertical guide line is generated at the snap coordinate
			expect(snapFeedback.x).toHaveLength(1);
			expect(snapFeedback.x[0]).toMatchObject({
				coordinate: 150,
				sourceObjectIds: ["other"],
			});
			// The guide spans the snapped bbox (top 0 / bottom 50) merged with the candidate range (0-200)
			expect(snapFeedback.x[0].lineStart).toBe(0);
			expect(snapFeedback.x[0].lineEnd).toBe(200);
			expect(snapFeedback.y).toEqual([]);
		});

		it("does not snap when the candidate is outside the threshold", () => {
			// 13px away from the candidate at 160 (> SNAP_THRESHOLD_PX = 8)
			const { resizeResult, snapFeedback } = snapResizeAt(
				"rightCenter",
				147,
				25,
				{
					snapCandidates: { x: [makeCandidate("other", 160, "right")], y: [] },
				},
			);

			expect(resizeResult.width).toBeCloseTo(147);
			expect(snapFeedback).toEqual({ x: [], y: [] });
		});

		it("ignores candidates whose objectId is excluded", () => {
			const { resizeResult, snapFeedback } = snapResizeAt(
				"rightCenter",
				147,
				25,
				{
					snapCandidates: {
						x: [makeCandidate("child-1", 150, "right")],
						y: [],
					},
					excludeIds: new Set(["child-1"]),
				},
			);

			expect(resizeResult.width).toBeCloseTo(147);
			expect(snapFeedback).toEqual({ x: [], y: [] });
		});

		it("shrinks the threshold in SVG units as the zoom increases", () => {
			// zoom=4 -> threshold 8/4=2 SVG units, so a 3px gap no longer snaps
			const { resizeResult } = snapResizeAt("rightCenter", 147, 25, {
				snapCandidates: { x: [makeCandidate("other", 150, "right")], y: [] },
				zoom: 4,
			});

			expect(resizeResult.width).toBeCloseTo(147);
		});
	});

	describe("edge anchor (Y axis)", () => {
		it("snaps the dragged bottom edge and never snaps the X axis of a vertical-only anchor", () => {
			// bottomCenter moves only the bottom edge; an X candidate at the current right edge must be ignored
			const { resizeResult, snapFeedback } = snapResizeAt(
				"bottomCenter",
				50,
				77,
				{
					snapCandidates: {
						x: [makeCandidate("other-x", 100, "right")],
						y: [makeCandidate("other-y", 80, "bottom")],
					},
				},
			);

			expect(resizeResult.height).toBeCloseTo(80);
			expect(resizeResult.width).toBeCloseTo(100);
			expect(snapFeedback.y).toHaveLength(1);
			expect(snapFeedback.y[0]).toMatchObject({ coordinate: 80 });
			expect(snapFeedback.x).toEqual([]);
		});
	});

	describe("corner anchor (both axes)", () => {
		it("snaps the X and Y edges simultaneously", () => {
			// bottomRight at (147, 76): right edge 3px from 150, bottom edge 4px from 80
			const { resizeResult, snapFeedback } = snapResizeAt(
				"bottomRight",
				147,
				76,
				{
					snapCandidates: {
						x: [makeCandidate("other-x", 150, "right")],
						y: [makeCandidate("other-y", 80, "bottom")],
					},
				},
			);

			expect(resizeResult.width).toBeCloseTo(150);
			expect(resizeResult.height).toBeCloseTo(80);
			expect(snapFeedback.x[0]).toMatchObject({ coordinate: 150 });
			expect(snapFeedback.y[0]).toMatchObject({ coordinate: 80 });
		});
	});
});
