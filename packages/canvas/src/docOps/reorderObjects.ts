import { requireObjects } from "./objectAccess";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";

/**
 * Where objects are taken to in their parent's stacking order. "front" / "back" go the whole
 * way in one call, "forward" / "backward" by one neighbour, as the arrange commands behind
 * Ctrl+] / Ctrl+[ do.
 */
export type ZOrderPlacement = "front" | "back" | "forward" | "backward";

/** Rewrite a parent array in place, since the doc tree holds the array itself. */
const replaceSiblings = (
	siblings: ObjectDoc[],
	ordered: readonly ObjectDoc[],
): void => {
	siblings.splice(0, siblings.length, ...ordered);
};

/** Gather the targets at one end, keeping the order they already sit in among themselves. */
const moveToEnd = (
	siblings: ObjectDoc[],
	targetIds: ReadonlySet<string>,
	end: "front" | "back",
): void => {
	const moved = siblings.filter((object) => targetIds.has(object.id));
	const stayed = siblings.filter((object) => !targetIds.has(object.id));
	replaceSiblings(
		siblings,
		end === "front" ? [...stayed, ...moved] : [...moved, ...stayed],
	);
};

/**
 * Swap every target past the neighbour in front of it, skipping neighbours that are targets
 * themselves so a run of them moves as one block. Visiting from the front keeps a target that
 * has just moved from being moved again.
 */
const stepForward = (
	siblings: ObjectDoc[],
	targetIds: ReadonlySet<string>,
): void => {
	for (let index = siblings.length - 2; index >= 0; index -= 1) {
		if (
			targetIds.has(siblings[index].id) &&
			!targetIds.has(siblings[index + 1].id)
		) {
			[siblings[index], siblings[index + 1]] = [
				siblings[index + 1],
				siblings[index],
			];
		}
	}
};

/** {@link stepForward} the other way round, visiting from the back. */
const stepBackward = (
	siblings: ObjectDoc[],
	targetIds: ReadonlySet<string>,
): void => {
	for (let index = 1; index < siblings.length; index += 1) {
		if (
			targetIds.has(siblings[index].id) &&
			!targetIds.has(siblings[index - 1].id)
		) {
			[siblings[index - 1], siblings[index]] = [
				siblings[index],
				siblings[index - 1],
			];
		}
	}
};

/**
 * Restack objects within the parent that holds them, mutating `doc` in place.
 *
 * Drawing order is array order: the last child of `doc.root` is drawn over everything else,
 * so "front" means the end of the array. Reordering happens inside each parent — root
 * children among root children, a group's children among their siblings — so ids spread over
 * several parents are each moved within their own, and an object never leaves the group it is
 * in. A group moves as the single object it is, taking its children with it.
 *
 * Objects moved together keep their order relative to one another, matching the arrange
 * commands (BringToFrontCommand 参照): sending two objects to the front does not put the
 * one named second on top.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to restack; all must exist in the root tree, and duplicates are harmless.
 *   Order within `ids` carries no meaning — the objects' own stacking order is what is kept
 * @param placement - "front" / "back" for the extremes of the parent, "forward" / "backward"
 *   for one step past the nearest object that is not itself being moved. A step that would
 *   go past the end does nothing
 * @throws {@link DocOperationError} naming every id that was not found, before anything is
 *   reordered
 */
export const reorderObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
	placement: ZOrderPlacement,
): void => {
	const locations = requireObjects(doc, ids);
	const targetIdsByParent = new Map<ObjectDoc[], Set<string>>();
	for (const { object, siblings } of locations) {
		const targetIds = targetIdsByParent.get(siblings) ?? new Set<string>();
		targetIds.add(object.id);
		targetIdsByParent.set(siblings, targetIds);
	}

	for (const [siblings, targetIds] of targetIdsByParent) {
		switch (placement) {
			case "front":
				moveToEnd(siblings, targetIds, "front");
				break;
			case "back":
				moveToEnd(siblings, targetIds, "back");
				break;
			case "forward":
				stepForward(siblings, targetIds);
				break;
			case "backward":
				stepBackward(siblings, targetIds);
				break;
		}
	}
};
