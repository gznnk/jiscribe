import {
	calcAffineTransformedPoint,
	calcBoundingBox,
	calcOrientedFrameFromPoints,
	calcPolyBoundingBox,
	degreesToRadians,
	isTransformedFrame,
} from "@workspace/geometry";
import type { Point, TransformedFrame } from "@workspace/geometry";

import { isPoly } from "../../../../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";

/**
 * Computes the bounding box of the multiSelectGroup (accounting for rotation).
 * When existingGroup is given, computes an Oriented Bounding Box that accounts for its rotation/scale.
 */
export function calcMultiSelectGroupBounds(
	selectedIds: string[],
	allObjects: Record<string, ObjectState>,
	existingGroup?: GroupState | null,
): { cx: number; cy: number; width: number; height: number } | null {
	if (selectedIds.length <= 1) {
		return null;
	}

	// When existingGroup is given, compute an OBB that accounts for its rotation/scale
	if (existingGroup) {
		// Collect all points of the children
		const allPoints = collectChildPoints(allObjects, selectedIds);
		if (allPoints.length === 0) {
			return null;
		}

		// Get the group's transform
		const groupRotation = existingGroup.rotation ?? 0;
		const groupScaleX = existingGroup.scaleX ?? 1;
		const groupScaleY = existingGroup.scaleY ?? 1;

		// Compute an Oriented Bounding Box with the group's transform from the point set
		const obb = calcOrientedFrameFromPoints(
			allPoints,
			groupScaleX,
			groupScaleY,
			groupRotation,
		);

		if (!obb) {
			return null;
		}

		return {
			cx: obb.cx,
			cy: obb.cy,
			width: obb.width,
			height: obb.height,
		};
	}

	// When there is no existingGroup, compute an axis-aligned bounding box
	const bounds = {
		minX: Infinity,
		maxX: -Infinity,
		minY: Infinity,
		maxY: -Infinity,
	};
	collectBounds(allObjects, selectedIds, bounds);

	if (!isFinite(bounds.minX)) {
		return null;
	}

	const cx = (bounds.minX + bounds.maxX) / 2;
	const cy = (bounds.minY + bounds.maxY) / 2;
	const width = bounds.maxX - bounds.minX;
	const height = bounds.maxY - bounds.minY;

	return { cx, cy, width, height };
}

/**
 * Recursively traverses the children to update the bounding box.
 */
function collectBounds(
	objects: Record<string, ObjectState>,
	childIds: string[],
	bounds: { minX: number; maxX: number; minY: number; maxY: number },
): void {
	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) {
			continue;
		}

		if (child.type === "group") {
			const nestedGroup = child as GroupState;
			collectBounds(objects, nestedGroup.childIds, bounds);
		} else if (isTransformedFrame(child)) {
			const box = calcBoundingBox(child);
			bounds.minX = Math.min(bounds.minX, box.left);
			bounds.maxX = Math.max(bounds.maxX, box.right);
			bounds.minY = Math.min(bounds.minY, box.top);
			bounds.maxY = Math.max(bounds.maxY, box.bottom);
		} else if (isPoly(child)) {
			// For Poly-based shapes (Polyline, Polygon), compute the bounding box directly from the points array
			const bbox = calcPolyBoundingBox(child.points);
			if (bbox) {
				bounds.minX = Math.min(bounds.minX, bbox.left);
				bounds.maxX = Math.max(bounds.maxX, bbox.right);
				bounds.minY = Math.min(bounds.minY, bbox.top);
				bounds.maxY = Math.max(bounds.maxY, bbox.bottom);
			}
		}
	}
}

/**
 * Recursively collects all points of the children.
 * Frame-based shapes contribute corner points; Poly-based shapes contribute vertices.
 */
function collectChildPoints(
	objects: Record<string, ObjectState>,
	childIds: string[],
): Point[] {
	const points: Point[] = [];

	for (const childId of childIds) {
		const child = objects[childId];
		if (!child) {
			continue;
		}

		if (child.type === "group") {
			const nestedGroup = child as GroupState;
			points.push(...collectChildPoints(objects, nestedGroup.childIds));
		} else if (isTransformedFrame(child)) {
			// For objects with a TransformedFrame, add their corner points
			points.push(...getFrameCornerPoints(child));
		} else if (isPoly(child)) {
			// For Poly-based shapes, add the points array directly
			points.push(...child.points);
		}
	}

	return points;
}

/**
 * Gets the four corner points of a TransformedFrame.
 */
function getFrameCornerPoints(frame: TransformedFrame): Point[] {
	const { cx, cy, width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// The four corners in the local coordinate system
	const localCorners: Point[] = [
		{ x: -halfWidth, y: -halfHeight }, // top-left
		{ x: halfWidth, y: -halfHeight }, // top-right
		{ x: halfWidth, y: halfHeight }, // bottom-right
		{ x: -halfWidth, y: halfHeight }, // bottom-left
	];

	// Apply the affine transform to convert to the global coordinate system
	const radians = degreesToRadians(rotation);
	return localCorners.map((corner) =>
		calcAffineTransformedPoint(
			corner.x,
			corner.y,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
	);
}
