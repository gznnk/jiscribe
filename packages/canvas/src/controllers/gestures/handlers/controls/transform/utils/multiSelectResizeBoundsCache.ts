import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import {
	calcFrameCornerPoints,
	degreesToRadians,
	isTransformedFrame,
} from "@jiscribe/geometry";

import { MIN_GROUP_DIMENSION } from "../../../../../../constants/groupDimensions";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { isConnectorState } from "../../../../../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { MultiSelectResizeBoundsCache } from "../../../../../CanvasTypes";
import { classifyChildRelativeRotation } from "../../../../../utils/classifyChildRelativeRotation";
import { collectObjectPoints } from "../../../../../utils/collectObjectPoints";

/**
 * Builds the dragStart cache for multi-select resize bounds (#215).
 *
 * Leaves whose group transform is an exact affine map (polys and axis-aligned
 * frames — see classifyChildRelativeRotation) are folded once into extents in
 * the start group's rotation-aligned local space; the remaining leaves
 * (connectors and oblique frames) are listed for per-frame re-collection.
 *
 * Dispatch order mirrors collectObjectPoints (connector before isPoly,
 * group before isTransformedFrame).
 */
export function createMultiSelectResizeBoundsCache(
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	startGroup: GroupState,
): MultiSelectResizeBoundsCache {
	const radians = degreesToRadians(startGroup.rotation ?? 0);
	const cosTheta = Math.cos(radians);
	const sinTheta = Math.sin(radians);

	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	let hasAffinePoints = false;
	const nonAffineLeafIds: string[] = [];

	const foldPointIntoExtents = (pointX: number, pointY: number) => {
		// Offset from the start group center, un-rotated into the group's local axes
		const offsetX = pointX - startGroup.cx;
		const offsetY = pointY - startGroup.cy;
		const localX = cosTheta * offsetX + sinTheta * offsetY;
		const localY = -sinTheta * offsetX + cosTheta * offsetY;
		if (localX < minX) {
			minX = localX;
		}
		if (localX > maxX) {
			maxX = localX;
		}
		if (localY < minY) {
			minY = localY;
		}
		if (localY > maxY) {
			maxY = localY;
		}
		hasAffinePoints = true;
	};

	const visit = (obj: ObjectState) => {
		if (isConnectorState(obj)) {
			nonAffineLeafIds.push(obj.id);
			return;
		}

		if (isGroupState(obj)) {
			for (const childId of obj.childIds) {
				const child = objects[childId];
				if (child) {
					visit(child);
				}
			}
			return;
		}

		if (isTransformedFrame(obj)) {
			if (
				classifyChildRelativeRotation(obj.rotation, startGroup.rotation) ===
				"oblique"
			) {
				nonAffineLeafIds.push(obj.id);
			} else {
				for (const corner of calcFrameCornerPoints(obj)) {
					foldPointIntoExtents(corner.x, corner.y);
				}
			}
			return;
		}

		if (isPoly(obj)) {
			for (const point of obj.points) {
				foldPointIntoExtents(point.x, point.y);
			}
		}
	};

	for (const selectedId of selectedIds) {
		const obj = objects[selectedId];
		if (obj) {
			visit(obj);
		}
	}

	return {
		affineLocalExtents: hasAffinePoints ? { minX, maxX, minY, maxY } : null,
		nonAffineLeafIds,
	};
}

/**
 * Derives the multi-select group bounds during a resize drag from the dragStart
 * cache, re-collecting points only for the non-affine leaves.
 *
 * Result matches calcMultiSelectGroupBounds (calcOrientedFrameFromPoints path)
 * up to float error: the OBB is fully determined by the extents of
 * the leaf points projected onto the group's rotated axes, and the affine leaves'
 * projected extents follow analytically from the startGroup → updatedGroup map
 * applied by transformFrameByGroup / transformPolyByGroup.
 */
export function calcMultiSelectGroupBoundsFromCache(
	cache: MultiSelectResizeBoundsCache,
	objects: Record<string, ObjectState>,
	startGroup: GroupState,
	updatedGroup: GroupState,
): { cx: number; cy: number; width: number; height: number } | null {
	const groupRotation = updatedGroup.rotation ?? 0;
	const groupScaleX = updatedGroup.scaleX ?? 1;
	const groupScaleY = updatedGroup.scaleY ?? 1;
	const radians = degreesToRadians(groupRotation);
	const cosTheta = Math.cos(radians);
	const sinTheta = Math.sin(radians);

	// Extents of all leaf points projected onto the group's rotated axes (world space)
	let minU = Infinity;
	let maxU = -Infinity;
	let minV = Infinity;
	let maxV = -Infinity;

	for (const leafId of cache.nonAffineLeafIds) {
		const leaf = objects[leafId];
		if (!leaf) {
			continue;
		}
		for (const point of collectObjectPoints(leaf, objects)) {
			const u = cosTheta * point.x + sinTheta * point.y;
			const v = -sinTheta * point.x + cosTheta * point.y;
			if (u < minU) {
				minU = u;
			}
			if (u > maxU) {
				maxU = u;
			}
			if (v < minV) {
				minV = v;
			}
			if (v > maxV) {
				maxV = v;
			}
		}
	}

	const affineLocalExtents = cache.affineLocalExtents;
	if (affineLocalExtents) {
		// Affine leaves keep their start local offsets up to a per-axis factor
		// (see transformPolyByGroup): startScale * endScale * (endSize / startSize)
		const factorX =
			(startGroup.scaleX ?? 1) *
			groupScaleX *
			(startGroup.width !== 0 ? updatedGroup.width / startGroup.width : 1);
		const factorY =
			(startGroup.scaleY ?? 1) *
			groupScaleY *
			(startGroup.height !== 0 ? updatedGroup.height / startGroup.height : 1);
		const centerU = cosTheta * updatedGroup.cx + sinTheta * updatedGroup.cy;
		const centerV = -sinTheta * updatedGroup.cx + cosTheta * updatedGroup.cy;

		// A negative factor mirrors the extents, so reorder min/max accordingly
		const scaledMinX = Math.min(
			affineLocalExtents.minX * factorX,
			affineLocalExtents.maxX * factorX,
		);
		const scaledMaxX = Math.max(
			affineLocalExtents.minX * factorX,
			affineLocalExtents.maxX * factorX,
		);
		const scaledMinY = Math.min(
			affineLocalExtents.minY * factorY,
			affineLocalExtents.maxY * factorY,
		);
		const scaledMaxY = Math.max(
			affineLocalExtents.minY * factorY,
			affineLocalExtents.maxY * factorY,
		);

		minU = Math.min(minU, scaledMinX + centerU);
		maxU = Math.max(maxU, scaledMaxX + centerU);
		minV = Math.min(minV, scaledMinY + centerV);
		maxV = Math.max(maxV, scaledMaxY + centerV);
	}

	if (minU === Infinity) {
		return null;
	}

	// Same construction as calcOrientedFrameFromPoints: width/height are the
	// projected extents divided by scale; the center is the mid-projection
	// rotated back into world space
	const width = (maxU - minU) / Math.abs(groupScaleX);
	const height = (maxV - minV) / Math.abs(groupScaleY);
	const midU = (minU + maxU) / 2;
	const midV = (minV + maxV) / 2;

	// GroupState invariant: a degenerate axis (collinear selection) must not
	// produce a zero-size group — its size is a divisor in transformFrameByGroup
	return {
		cx: cosTheta * midU - sinTheta * midV,
		cy: sinTheta * midU + cosTheta * midV,
		width: Math.max(width, MIN_GROUP_DIMENSION),
		height: Math.max(height, MIN_GROUP_DIMENSION),
	};
}
