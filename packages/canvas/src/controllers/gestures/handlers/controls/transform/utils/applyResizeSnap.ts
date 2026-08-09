import type { FrameKeyPoints, TransformedFrame } from "@jiscribe/geometry";

import type { AnchorResizeResult } from "./calcAnchorResize";
import { calcAnchorResize } from "./calcAnchorResize";
import {
	calcSnapCursorDelta,
	calcTentativeBBox,
	getAnchorXSnapEdge,
	getAnchorYSnapEdge,
} from "./calcSnapCursorDelta";
import type { TransformState } from "../../../../../../states/objects/base/TransformState";
import type { SnapCandidates, SnapFeedback } from "../../../../../CanvasTypes";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../../../utils/snap/findSnap";
import type { TransformAnchorType } from "../TransformAnchorType";

export type ApplyResizeSnapParams = {
	anchorType: TransformAnchorType;
	startFrame: TransformedFrame & TransformState;
	cursorX: number;
	cursorY: number;
	startFrameKeyPoints: FrameKeyPoints;
	radians: number;
	aspectRatio: number | undefined;
	doKeepProportion: boolean;
	resizeResult: AnchorResizeResult;
	snapCandidates: SnapCandidates;
	excludeIds: ReadonlySet<string>;
	zoom: number;
};

/**
 * Applies snap correction to a resize result.
 *
 * Estimates how the transformed AABB reacts to cursor movement with a
 * numerical Jacobian (re-running the resize with the cursor moved by ε), then
 * back-computes the cursor correction that aligns the snapping edges with the
 * snap candidates and re-runs the resize with the corrected cursor.
 */
export function applyResizeSnap(params: ApplyResizeSnapParams): {
	resizeResult: AnchorResizeResult;
	snapFeedback: SnapFeedback;
} {
	const {
		anchorType,
		startFrame,
		cursorX,
		cursorY,
		startFrameKeyPoints,
		radians,
		aspectRatio,
		doKeepProportion,
		snapCandidates,
		excludeIds,
		zoom,
	} = params;

	let resizeResult = params.resizeResult;
	let snapFeedback: SnapFeedback = { x: [], y: [] };

	const tentativeBBox = calcTentativeBBox(resizeResult, startFrame, radians);
	const xEdge = getAnchorXSnapEdge(anchorType, resizeResult.scaleX);
	const yEdge = getAnchorYSnapEdge(anchorType, resizeResult.scaleY);

	if (xEdge === null && yEdge === null) {
		return { resizeResult, snapFeedback };
	}

	// Numerical Jacobian: compute the BBox change when the cursor moves by ε
	const ε = 1.0;
	const resPlusDx = calcAnchorResize(
		anchorType,
		startFrame,
		cursorX + ε,
		cursorY,
		startFrameKeyPoints,
		radians,
		aspectRatio,
		doKeepProportion,
	);
	const resPlusDy = calcAnchorResize(
		anchorType,
		startFrame,
		cursorX,
		cursorY + ε,
		startFrameKeyPoints,
		radians,
		aspectRatio,
		doKeepProportion,
	);
	const bboxPlusDx = resPlusDx
		? calcTentativeBBox(resPlusDx, startFrame, radians)
		: tentativeBBox;
	const bboxPlusDy = resPlusDy
		? calcTentativeBBox(resPlusDy, startFrame, radians)
		: tentativeBBox;

	const J = {
		left: {
			dx: (bboxPlusDx.left - tentativeBBox.left) / ε,
			dy: (bboxPlusDy.left - tentativeBBox.left) / ε,
		},
		right: {
			dx: (bboxPlusDx.right - tentativeBBox.right) / ε,
			dy: (bboxPlusDy.right - tentativeBBox.right) / ε,
		},
		top: {
			dx: (bboxPlusDx.top - tentativeBBox.top) / ε,
			dy: (bboxPlusDy.top - tentativeBBox.top) / ε,
		},
		bottom: {
			dx: (bboxPlusDx.bottom - tentativeBBox.bottom) / ε,
			dy: (bboxPlusDy.bottom - tentativeBBox.bottom) / ε,
		},
	} as const;

	// Skip snapping for low-sensitivity edges
	const SENSITIVITY = 0.3;
	const xSens = xEdge
		? Math.max(Math.abs(J[xEdge].dx), Math.abs(J[xEdge].dy))
		: 0;
	const ySens = yEdge
		? Math.max(Math.abs(J[yEdge].dx), Math.abs(J[yEdge].dy))
		: 0;
	const snapX = xEdge !== null && xSens > SENSITIVITY;
	const snapY = yEdge !== null && ySens > SENSITIVITY;

	if (!snapX && !snapY) {
		return { resizeResult, snapFeedback };
	}

	const findSnapResult = findSnap(
		snapCandidates,
		SNAP_THRESHOLD_PX / zoom,
		snapX && xEdge ? [tentativeBBox[xEdge]] : [],
		snapY && yEdge ? [tentativeBBox[yEdge]] : [],
		excludeIds,
	);

	const cursorDelta = calcSnapCursorDelta(
		J,
		snapX ? xEdge : null,
		snapY ? yEdge : null,
		findSnapResult.delta.x,
		findSnapResult.delta.y,
	);

	if (cursorDelta.dx !== 0 || cursorDelta.dy !== 0) {
		const snapped = calcAnchorResize(
			anchorType,
			startFrame,
			cursorX + cursorDelta.dx,
			cursorY + cursorDelta.dy,
			startFrameKeyPoints,
			radians,
			aspectRatio,
			doKeepProportion,
		);
		if (snapped) {
			resizeResult = snapped;
		}
	}

	// Generate guide lines from the actual BBox after snapping
	const actualBBox = calcTentativeBBox(resizeResult, startFrame, radians);
	snapFeedback = buildSnapFeedback(
		actualBBox,
		findSnapResult.xResult,
		findSnapResult.yResult,
		snapCandidates,
		excludeIds,
	);

	return { resizeResult, snapFeedback };
}
