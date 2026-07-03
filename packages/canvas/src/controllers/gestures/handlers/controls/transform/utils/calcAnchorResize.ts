import type {
	FrameKeyPoints,
	KeyPointId,
	TransformedFrame,
} from "@workspace/geometry";
import {
	calcInverseAffineTransformedPoint,
	calcNonZeroSign,
	calcProjectionOntoLine,
	nanToZero,
} from "@workspace/geometry";

import {
	calcHeightWithAspectRatio,
	calcWidthWithAspectRatio,
	enforceResizeDimensions,
} from "./enforceResizeDimensions";
import type { TransformState } from "../../../../../../states/objects/base/TransformState";
import type { TransformAnchorType } from "../TransformAnchorType";

/** Result of an anchor resize calculation (center in the object's local space). */
export type AnchorResizeResult = {
	width: number;
	height: number;
	inversedCenterX: number;
	inversedCenterY: number;
	scaleX: number;
	scaleY: number;
};

/**
 * Geometry of a resize anchor, parameterized by a direction vector in the
 * object's local space.
 *
 * dx/dy: which way the anchor pushes each axis relative to the opposite
 * keypoint (-1 = toward left/top, 0 = axis fixed, 1 = toward right/bottom).
 * The opposite keypoint stays fixed during the resize.
 */
type ResizeAnchorGeometry = {
	dx: -1 | 0 | 1;
	dy: -1 | 0 | 1;
	anchorKeyPointId: KeyPointId;
	oppositeKeyPointId: KeyPointId;
};

const RESIZE_ANCHOR_GEOMETRIES: Partial<
	Record<TransformAnchorType, ResizeAnchorGeometry>
> = {
	topLeft: {
		dx: -1,
		dy: -1,
		anchorKeyPointId: "topLeft",
		oppositeKeyPointId: "bottomRight",
	},
	topCenter: {
		dx: 0,
		dy: -1,
		anchorKeyPointId: "topCenter",
		oppositeKeyPointId: "bottomCenter",
	},
	topRight: {
		dx: 1,
		dy: -1,
		anchorKeyPointId: "topRight",
		oppositeKeyPointId: "bottomLeft",
	},
	rightCenter: {
		dx: 1,
		dy: 0,
		anchorKeyPointId: "rightCenter",
		oppositeKeyPointId: "leftCenter",
	},
	bottomRight: {
		dx: 1,
		dy: 1,
		anchorKeyPointId: "bottomRight",
		oppositeKeyPointId: "topLeft",
	},
	bottomCenter: {
		dx: 0,
		dy: 1,
		anchorKeyPointId: "bottomCenter",
		oppositeKeyPointId: "topCenter",
	},
	bottomLeft: {
		dx: -1,
		dy: 1,
		anchorKeyPointId: "bottomLeft",
		oppositeKeyPointId: "topRight",
	},
	leftCenter: {
		dx: -1,
		dy: 0,
		anchorKeyPointId: "leftCenter",
		oppositeKeyPointId: "rightCenter",
	},
};

/**
 * Performs the resize calculation for a transform anchor.
 * Returns null when the anchor type does not resize (e.g. "rotation" or an
 * unknown value parsed from a control id).
 */
export function calcAnchorResize(
	anchorType: TransformAnchorType,
	startFrame: TransformedFrame & TransformState,
	cursorX: number,
	cursorY: number,
	startFrameKeyPoints: FrameKeyPoints,
	radians: number,
	aspectRatio: number | undefined,
	doKeepProportion: boolean,
): AnchorResizeResult | null {
	const anchorGeometry = RESIZE_ANCHOR_GEOMETRIES[anchorType];
	if (!anchorGeometry) {
		return null;
	}

	const { dx, dy, anchorKeyPointId, oppositeKeyPointId } = anchorGeometry;
	const isCornerAnchor = dx !== 0 && dy !== 0;

	// Apply drag constraints to the cursor position.
	// Edge anchors always move along the opposite->anchor line; corner anchors
	// are constrained onto the diagonal only while keeping proportion.
	const shouldConstrainCursor = isCornerAnchor ? doKeepProportion : true;
	const constrained = shouldConstrainCursor
		? calcProjectionOntoLine(
				startFrameKeyPoints[oppositeKeyPointId],
				startFrameKeyPoints[anchorKeyPointId],
				{ x: cursorX, y: cursorY },
			)
		: { x: cursorX, y: cursorY };

	// Transform the cursor into the object's local space (rotation only, no scale)
	const inversedCursor = calcInverseAffineTransformedPoint(
		constrained.x,
		constrained.y,
		1,
		1,
		radians,
		startFrame.cx,
		startFrame.cy,
	);

	const oppositePoint = startFrameKeyPoints[oppositeKeyPointId];
	const inversedOpposite = calcInverseAffineTransformedPoint(
		oppositePoint.x,
		oppositePoint.y,
		1,
		1,
		radians,
		startFrame.cx,
		startFrame.cy,
	);

	// New dimensions: the moving axes follow the cursor (signed by direction),
	// a fixed axis keeps the start size unless the aspect ratio dictates it.
	let newWidth: number;
	let newHeight: number;
	if (dx === 0) {
		newHeight = dy * (inversedCursor.y - inversedOpposite.y);
		newWidth =
			doKeepProportion && aspectRatio !== undefined
				? calcWidthWithAspectRatio(newHeight, aspectRatio)
				: startFrame.width;
	} else {
		newWidth = dx * (inversedCursor.x - inversedOpposite.x);
		if (doKeepProportion && aspectRatio !== undefined) {
			newHeight = calcHeightWithAspectRatio(newWidth, aspectRatio);
		} else if (dy === 0) {
			newHeight = startFrame.height;
		} else {
			newHeight = dy * (inversedCursor.y - inversedOpposite.y);
		}
	}

	// Calculate scaleX and scaleY from the sign of newWidth and newHeight;
	// an axis the anchor does not move keeps the current scale
	const newScaleX = dx !== 0 ? calcNonZeroSign(newWidth) : startFrame.scaleX;
	const newScaleY = dy !== 0 ? calcNonZeroSign(newHeight) : startFrame.scaleY;

	const enforced = enforceResizeDimensions(
		startFrame,
		newWidth,
		newHeight,
		aspectRatio,
		doKeepProportion,
	);

	// The opposite keypoint stays fixed; the center moves half the new size toward the anchor
	const inversedCenterX =
		inversedOpposite.x + dx * nanToZero(enforced.width / 2);
	const inversedCenterY =
		inversedOpposite.y + dy * nanToZero(enforced.height / 2);

	return {
		width: enforced.width,
		height: enforced.height,
		inversedCenterX,
		inversedCenterY,
		scaleX: newScaleX,
		scaleY: newScaleY,
	};
}
