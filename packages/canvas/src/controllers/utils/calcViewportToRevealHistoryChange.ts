import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ResolvedViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import type { BoundingBox } from "@jiscribe/geometry";

import { calcCameraToRevealBox } from "./calcCameraToRevealBox";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import { calcScrollBounds } from "./calcScrollBounds";
import { clampScrolledCamera } from "./clampScrolledCamera";
import { isSameCamera } from "./isSameCamera";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { Viewport } from "../../rendering/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Empty margin kept between the revealed change and the viewport edge, in
 * screen px; the same margin zoom-to-fit leaves around the drawing.
 */
const HISTORY_REVEAL_PADDING = 48;

/** Ids an entry swap touched, split by which side still holds the object. */
type HistoryChange = {
	/** In the restored doc and changed or new there; measured in its objects. */
	restoredIds: string[];
	/** Only in the doc being left; measured in the objects before the swap. */
	removedIds: string[];
};

/**
 * Every non-group object of the tree by id, serialized for comparison. Groups
 * are skipped: their children and the connectors say where anything moved.
 */
const flattenDocObjects = (doc: CanvasDoc): Map<string, string> => {
	const serializedObjects = new Map<string, string>();
	const visit = (objDocs: readonly ObjectDoc[]) => {
		for (const objDoc of objDocs) {
			if (objDoc.type === "group") {
				visit((objDoc as GroupDoc).children);
				continue;
			}
			serializedObjects.set(objDoc.id, JSON.stringify(objDoc));
		}
	};
	visit(doc.root);
	return serializedObjects;
};

/**
 * What an entry swap changed, object by object. Compared as JSON strings, so
 * the same object with its keys in another order reads as modified (the same
 * caveat as isSameCanvasDocContent): at worst a reveal that was not needed.
 */
const diffDocObjects = (leftDoc: CanvasDoc, restoredDoc: CanvasDoc) => {
	const leftObjects = flattenDocObjects(leftDoc);
	const restoredObjects = flattenDocObjects(restoredDoc);
	const change: HistoryChange = { restoredIds: [], removedIds: [] };
	for (const [id, serialized] of restoredObjects) {
		if (leftObjects.get(id) !== serialized) {
			change.restoredIds.push(id);
		}
	}
	for (const id of leftObjects.keys()) {
		if (!restoredObjects.has(id)) {
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
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">,
): BoundingBox | null => {
	let merged = union;
	for (const id of ids) {
		const obj = objects[id];
		const box = obj ? calcObjectBoundingBox(obj, objects, visualBounds) : null;
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
 * large for the view at that zoom is centred on each axis it overflows.
 * Changes to `background`, `view` or stacking order alone move nothing.
 *
 * The pan stops at the scroll wall the way a view scroll does
 * (clampScrolledCamera): the reveal margin gives way to the wall, while a view
 * already outside it is not pulled back.
 *
 * @param viewport - The viewport before the swap; returned as is (same
 *   reference) when nothing needs to move, including while it is unmeasured
 *   (either side 0 or less)
 * @param leftDoc - The doc of the entry being left
 * @param leftObjects - The objects before the swap, where removed objects are
 *   measured
 * @param restoredDoc - The doc of the entry being restored; the same reference
 *   as `leftDoc` short-cuts to no change
 * @param restoredObjects - The objects after the swap, where added and modified
 *   objects are measured
 * @param visualBounds - Widens each box by what its shape draws outside its
 *   geometry (see calcObjectBoundingBox), the wall's content extent included
 * @param scrollWallPadding - The restored document's wall margin as
 *   resolveScrollWallPadding answers it, or null when panning is unrestricted.
 *   The wall is measured from `restoredObjects`, not taken from the state's
 *   cached measurement, which still describes the entry being left
 * @returns The viewport to show; only `minX` / `minY` ever differ from
 *   `viewport`
 */
export const calcViewportToRevealHistoryChange = (
	viewport: Viewport,
	leftDoc: CanvasDoc,
	leftObjects: Record<string, ObjectState>,
	restoredDoc: CanvasDoc,
	restoredObjects: Record<string, ObjectState>,
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">,
	scrollWallPadding: ResolvedViewPadding | null,
): Viewport => {
	if (leftDoc === restoredDoc) {
		return viewport;
	}

	const { restoredIds, removedIds } = diffDocObjects(leftDoc, restoredDoc);
	const changedBox = unionObjectBoxes(
		unionObjectBoxes(null, restoredIds, restoredObjects, visualBounds),
		removedIds,
		leftObjects,
		visualBounds,
	);
	if (!changedBox) {
		return viewport;
	}

	const revealCamera = calcCameraToRevealBox(
		viewport,
		changedBox,
		HISTORY_REVEAL_PADDING,
		"center",
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
					calcScrollBounds(scrollWallPadding, restoredObjects, visualBounds),
				);
	if (isSameCamera(viewport, camera)) {
		return viewport;
	}
	return { ...viewport, minX: camera.minX, minY: camera.minY };
};
