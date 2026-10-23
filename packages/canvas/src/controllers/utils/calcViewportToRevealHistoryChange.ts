import type { ResolvedViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import type { BoundingBox } from "@jiscribe/geometry";

import { calcCameraToRevealBox } from "./calcCameraToRevealBox";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import { calcScrollBounds } from "./calcScrollBounds";
import { clampScrolledCamera } from "./clampScrolledCamera";
import { isSameCamera } from "./isSameCamera";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import type { Viewport } from "../../rendering/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Empty margin kept between the revealed change and the viewport edge, in
 * screen px; the same margin zoom-to-fit leaves around the drawing.
 */
const HISTORY_REVEAL_PADDING = 48;

/** Ids an entry swap touched, split by which side still holds the object. */
type HistoryChange = {
	/** In the restored objects and changed or new there; measured in them. */
	restoredIds: string[];
	/** Only in the objects being left; measured in them. */
	removedIds: string[];
};

/**
 * What an entry swap changed, object by object, by reference between the two
 * entries' committed objects: an entry holds the very ObjectStates it was
 * committed with, and none is ever mutated in place, so an object the swap
 * left alone is the same reference in both. The live maps would not do: a
 * re-measure after fonts arrive renews boxes without a commit, on either side
 * of the swap. An object rewritten with the same content reads as changed — at
 * worst a reveal that was not needed. Groups are skipped: their children and
 * the connectors say where anything moved.
 */
const diffEntryObjects = (
	leftEntryObjects: Record<string, ObjectState>,
	restoredEntryObjects: Record<string, ObjectState>,
): HistoryChange => {
	const change: HistoryChange = { restoredIds: [], removedIds: [] };
	for (const [id, restoredObject] of Object.entries(restoredEntryObjects)) {
		if (
			restoredObject.type !== "group" &&
			leftEntryObjects[id] !== restoredObject
		) {
			change.restoredIds.push(id);
		}
	}
	for (const [id, leftObject] of Object.entries(leftEntryObjects)) {
		if (leftObject.type !== "group" && !(id in restoredEntryObjects)) {
			change.removedIds.push(id);
		}
	}
	return change;
};

/** Union of the ids' boxes into `union`, or the first box found when it is null. */
const unionObjectBoxes = (
	union: BoundingBox | null,
	ids: readonly string[],
	objects: Record<string, ObjectState>,
	visualExtentRegistries: VisualExtentRegistries,
): BoundingBox | null => {
	let merged = union;
	for (const id of ids) {
		const obj = objects[id];
		const box = obj
			? calcObjectBoundingBox(obj, objects, visualExtentRegistries)
			: null;
		if (!box) {
			continue;
		}
		merged = merged
			? {
					left: Math.min(merged.left, box.left),
					top: Math.min(merged.top, box.top),
					right: Math.max(merged.right, box.right),
					bottom: Math.max(merged.bottom, box.bottom),
				}
			: box;
	}
	return merged;
};

/**
 * The viewport after an undo, redo or revert, panned just far enough to show
 * what the swap changed: the objects it added or modified where they now are,
 * and the ones it removed where they were. Zoom is never changed; a change too
 * large for the view at that zoom is left where it is on each axis it overflows
 * while part of it is on screen, and centred on that axis otherwise. The diff
 * is per object, so one cell of a large table reads as the whole table changed:
 * centring it would jump away from the cell being worked on.
 * Changes to `meta`, `background`, `view` or stacking order alone move nothing.
 *
 * The pan stops at the scroll wall the way a view scroll does
 * (clampScrolledCamera): the reveal margin gives way to the wall, while a view
 * already outside it is not pulled back.
 *
 * @param viewport - The viewport before the swap; returned as is (same
 *   reference) when nothing needs to move, including while it is unmeasured
 *   (either side 0 or less)
 * @param leftEntryObjects - The objects of the entry being left as committed
 *   (its `source`), compared against `restoredEntryObjects` by reference to
 *   find what the swap changed
 * @param leftObjects - The live objects before the swap, where removed objects
 *   are measured
 * @param restoredEntryObjects - The objects of the entry being restored as
 *   committed; the same reference as `leftEntryObjects` short-cuts to no change
 * @param restoredObjects - The objects after the swap, where added and modified
 *   objects are measured; they differ from `restoredEntryObjects` only by boxes
 *   re-measured since
 * @param visualExtentRegistries - Measures each box as drawn: what a shape draws
 *   outside its geometry, a connector's route as rendered (see
 *   calcObjectBoundingBox), the wall's content extent included
 * @param scrollWallPadding - The restored document's wall margin as
 *   resolveScrollWallPadding answers it, or null when panning is unrestricted.
 *   The wall is measured from `restoredObjects`, not taken from the state's
 *   cached measurement, which still describes the entry being left
 * @returns The viewport to show; only `minX` / `minY` ever differ from
 *   `viewport`
 */
export const calcViewportToRevealHistoryChange = (
	viewport: Viewport,
	leftEntryObjects: Record<string, ObjectState>,
	leftObjects: Record<string, ObjectState>,
	restoredEntryObjects: Record<string, ObjectState>,
	restoredObjects: Record<string, ObjectState>,
	visualExtentRegistries: VisualExtentRegistries,
	scrollWallPadding: ResolvedViewPadding | null,
): Viewport => {
	if (leftEntryObjects === restoredEntryObjects) {
		return viewport;
	}

	const { restoredIds, removedIds } = diffEntryObjects(
		leftEntryObjects,
		restoredEntryObjects,
	);
	const changedBox = unionObjectBoxes(
		unionObjectBoxes(
			null,
			restoredIds,
			restoredObjects,
			visualExtentRegistries,
		),
		removedIds,
		leftObjects,
		visualExtentRegistries,
	);
	if (!changedBox) {
		return viewport;
	}

	const revealCamera = calcCameraToRevealBox(
		viewport,
		changedBox,
		HISTORY_REVEAL_PADDING,
		"centerUnlessVisible",
	);
	if (!revealCamera) {
		return viewport;
	}
	const camera =
		scrollWallPadding === null
			? revealCamera
			: clampScrolledCamera(
					{ ...viewport, ...revealCamera },
					viewport,
					calcScrollBounds(
						scrollWallPadding,
						restoredObjects,
						visualExtentRegistries,
					),
				);
	if (isSameCamera(viewport, camera)) {
		return viewport;
	}
	return { ...viewport, minX: camera.minX, minY: camera.minY };
};
