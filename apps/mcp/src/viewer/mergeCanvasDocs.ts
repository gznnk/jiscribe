// Putting a person's unsaved edits on top of a file that was written elsewhere
// meanwhile: a three-way merge of the doc the edits were made on (base), the doc on
// screen (mine) and the doc that arrived (theirs).
//
// It goes object by object, at every depth, by id. What only one side changed is
// taken from that side; what both sides changed the same way is taken once. Where
// both changed the same object differently, or one deleted what the other changed,
// the file wins — theirs is already on disk and other readers have seen it — and
// the person's change is named in the result so that the page can say it went.
//
// Where an object sits is merged apart from what it holds: which container it is
// in, per object, and the order of each container's members, per container. So
// moving a shape and recolouring it on two sides is two edits, not a conflict. The
// document's own fields (background, view, anything unknown) are merged per key.
//
// Everything is compared as JSON, key order aside. The doc on screen comes from the
// canvas, which writes an object's keys in an order of its own, so the same object
// read from the file and written by the canvas has to count as unchanged.
//
// Nothing is validated here. A merge can still produce a doc the parser refuses —
// a connector the other side attached to an object this side deleted — so the
// caller parses the result before drawing it.

import type { CanvasDoc, ObjectDoc } from "@jiscribe/canvas";

/** The key a container keeps its members under (a group's `children`) */
const CHILDREN_KEY = "children";

/** The document field holding the top-level objects, merged apart from the rest */
const ROOT_KEY = "root";

/** A container's key in the maps below: an object's id, or null for the root */
type ContainerId = string | null;

/**
 * One of the person's changes that the merge dropped, because the file was changed
 * in a way it could not be put together with.
 *
 * - `object`: an object both sides changed differently (`changed-on-both`, which
 *   includes both adding one under the same id), one the person deleted while the
 *   file changed it (`deleted-here`; the file's is kept), or one the person changed
 *   while the file deleted it (`deleted-there`; it stays deleted)
 * - `placement`: an object both sides moved, into different containers
 * - `order`: a container whose members both sides reordered differently; `id` is
 *   the container's id, null for the top level
 * - `field`: a document field (`background`, `view`, …) both sides set differently
 */
export type CanvasMergeConflict =
	| {
			kind: "object";
			id: string;
			reason: "changed-on-both" | "deleted-here" | "deleted-there";
	  }
	| { kind: "placement"; id: string }
	| { kind: "order"; id: string | null }
	| { kind: "field"; key: string };

/** What {@link mergeCanvasDocs} returns */
export type CanvasMergeResult = {
	/** The merged document, not yet validated */
	doc: CanvasDoc;
	/** The person's changes that were dropped, in document order; empty when none */
	conflicts: CanvasMergeConflict[];
};

type JsonRecord = Record<string, unknown>;

/** One object as a side has it, taken out of the tree */
type PlacedObject = {
	/** The object as written, its members included */
	object: JsonRecord;
	/** The container it is in; null at the top level */
	parentId: ContainerId;
	/** Whether it is a container at all (carries a members array) */
	isContainer: boolean;
};

/** A side's document taken apart into objects and container orders */
type FlatDoc = {
	objects: Map<string, PlacedObject>;
	/** Member ids of every container, in document order; the root under null */
	memberIds: Map<ContainerId, string[]>;
	/** Every id in document order, depth first */
	orderedIds: string[];
};

const isJsonRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Whether two JSON values are the same, the order of object keys aside. A key
 * holding undefined counts as absent, as it does once serialized.
 *
 * @param left One value, as JSON.parse or a CanvasDoc would hold it
 * @param right The other
 */
export const isSameJsonValue = (left: unknown, right: unknown): boolean => {
	if (left === right) {
		return true;
	}
	if (Array.isArray(left) || Array.isArray(right)) {
		return (
			Array.isArray(left) &&
			Array.isArray(right) &&
			left.length === right.length &&
			left.every((item, index) => isSameJsonValue(item, right[index]))
		);
	}
	if (!isJsonRecord(left) || !isJsonRecord(right)) {
		return false;
	}
	const leftKeys = Object.keys(left).filter((key) => left[key] !== undefined);
	const rightKeys = Object.keys(right).filter(
		(key) => right[key] !== undefined,
	);
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every(
			(key) => key in right && isSameJsonValue(left[key], right[key]),
		)
	);
};

const readMembers = (object: JsonRecord): unknown[] | null => {
	const members = object[CHILDREN_KEY];
	return Array.isArray(members) ? members : null;
};

/** Whether two objects hold the same, where each of them sits and their members aside */
const isSameContent = (left: PlacedObject, right: PlacedObject): boolean => {
	if (left.isContainer !== right.isContainer) {
		return false;
	}
	const { [CHILDREN_KEY]: _leftMembers, ...leftContent } = left.object;
	const { [CHILDREN_KEY]: _rightMembers, ...rightContent } = right.object;
	return isSameJsonValue(leftContent, rightContent);
};

const flattenDoc = (doc: CanvasDoc): FlatDoc => {
	const objects = new Map<string, PlacedObject>();
	const memberIds = new Map<ContainerId, string[]>();
	const orderedIds: string[] = [];
	const visit = (members: readonly unknown[], parentId: ContainerId): void => {
		const ids: string[] = [];
		for (const member of members) {
			if (!isJsonRecord(member) || typeof member.id !== "string") {
				continue;
			}
			const children = readMembers(member);
			ids.push(member.id);
			orderedIds.push(member.id);
			objects.set(member.id, {
				object: member,
				parentId,
				isContainer: children !== null,
			});
			if (children !== null) {
				visit(children, member.id);
			}
		}
		memberIds.set(parentId, ids);
	};
	visit(doc.root, null);
	return { objects, memberIds, orderedIds };
};

/**
 * Three-way merge of one value that has no parts worth merging apart.
 *
 * @returns The value to keep, and whether both sides changed it differently
 *   (theirs is then the one kept)
 */
const mergeValue = <T>(
	baseValue: T,
	mineValue: T,
	theirsValue: T,
	isSame: (left: T, right: T) => boolean,
): { value: T; isConflict: boolean } => {
	if (isSame(mineValue, baseValue) || isSame(mineValue, theirsValue)) {
		return { value: theirsValue, isConflict: false };
	}
	if (isSame(theirsValue, baseValue)) {
		return { value: mineValue, isConflict: false };
	}
	return { value: theirsValue, isConflict: true };
};

/** Whether the ids two sides list in common come in the same order on both */
const isSameRelativeOrder = (
	leftIds: readonly string[],
	rightIds: readonly string[],
): boolean => {
	const leftSet = new Set(leftIds);
	const rightSet = new Set(rightIds);
	const leftCommon = leftIds.filter((id) => rightSet.has(id));
	const rightCommon = rightIds.filter((id) => leftSet.has(id));
	return leftCommon.every((id, index) => rightCommon[index] === id);
};

/**
 * Puts an id into an order under construction next to where a source order has it:
 * right after the nearest id before it there that is already placed. With nothing
 * placed after it there it goes last, and with nothing placed before it, right
 * before the nearest one after it — so that what a side put on top or at the
 * bottom stays there however the rest was reordered.
 *
 * @param orderedIds The order under construction; changed in place
 * @param id The id to place
 * @param sourceIds An order holding `anchorId`
 * @param anchorId The id whose place in `sourceIds` is taken: `id` itself, or the
 *   removed container `id` came out of
 */
const insertNextToSource = (
	orderedIds: string[],
	id: string,
	sourceIds: readonly string[],
	anchorId: string,
): void => {
	const anchorIndex = sourceIds.indexOf(anchorId);
	const findPlacedIndex = (sourceIndex: number, step: 1 | -1): number => {
		for (
			let index = sourceIndex + step;
			index >= 0 && index < sourceIds.length;
			index += step
		) {
			const placedIndex = orderedIds.indexOf(sourceIds[index]);
			if (placedIndex !== -1) {
				return placedIndex;
			}
		}
		return -1;
	};
	const placedAfterIndex = findPlacedIndex(anchorIndex, 1);
	if (placedAfterIndex === -1) {
		orderedIds.push(id);
		return;
	}
	const placedBeforeIndex = findPlacedIndex(anchorIndex, -1);
	orderedIds.splice(
		placedBeforeIndex === -1 ? placedAfterIndex : placedBeforeIndex + 1,
		0,
		id,
	);
};

/**
 * The container the first of the sides that has an object puts it in.
 *
 * @param id The object's id
 * @param sides The sides to look in, in order of preference
 * @returns The container's id; null for the top level, and when no side has it
 */
const findParentId = (id: string, sides: readonly FlatDoc[]): ContainerId => {
	for (const side of sides) {
		const placed = side.objects.get(id);
		if (placed !== undefined) {
			return placed.parentId;
		}
	}
	return null;
};

/**
 * Merges a person's edits (mine) and a write made elsewhere (theirs), both made on
 * the same document (base). See the top of this module for the rules.
 *
 * @param docs.base The document both sides started from: the text the host held
 *   when the person's first unsaved edit was made
 * @param docs.mine The document with the person's edits, as the canvas hands it
 *   over. Returned as theirs outright when it holds nothing base does not
 * @param docs.theirs The document that arrived, which wins every conflict. Returned
 *   as it is when mine holds no edits, so that nothing changes where there is
 *   nothing to merge
 * @returns The merged document and the person's changes it dropped. Objects are
 *   written the way the side they are taken from wrote them, unknown fields
 *   included; a container left without members is dropped, since the format has
 *   no empty group
 */
export const mergeCanvasDocs = ({
	base,
	mine,
	theirs,
}: {
	base: CanvasDoc;
	mine: CanvasDoc;
	theirs: CanvasDoc;
}): CanvasMergeResult => {
	if (isSameJsonValue(mine, base) || isSameJsonValue(mine, theirs)) {
		return { doc: theirs, conflicts: [] };
	}
	if (isSameJsonValue(theirs, base)) {
		return { doc: mine, conflicts: [] };
	}

	const flatBase = flattenDoc(base);
	const flatMine = flattenDoc(mine);
	const flatTheirs = flattenDoc(theirs);
	const conflicts: CanvasMergeConflict[] = [];
	const conflictedIds = new Set<string>();
	const addObjectConflict = (
		conflict: CanvasMergeConflict & { id: string },
	) => {
		if (conflictedIds.has(conflict.id)) {
			return;
		}
		conflictedIds.add(conflict.id);
		conflicts.push(conflict);
	};

	// Document order for everything decided below: theirs first, then what only
	// mine or only base has
	const allIds = [
		...new Set([
			...flatTheirs.orderedIds,
			...flatMine.orderedIds,
			...flatBase.orderedIds,
		]),
	];

	const isPlacementChanged = (
		side: PlacedObject,
		baseObject: PlacedObject,
	): boolean => side.parentId !== baseObject.parentId;

	// Which objects stay, and which side's writing of each is kept
	const keptObjects = new Map<string, PlacedObject>();
	for (const id of allIds) {
		const baseObject = flatBase.objects.get(id);
		const mineObject = flatMine.objects.get(id);
		const theirsObject = flatTheirs.objects.get(id);
		if (baseObject === undefined) {
			if (mineObject !== undefined && theirsObject !== undefined) {
				if (!isSameContent(mineObject, theirsObject)) {
					addObjectConflict({ kind: "object", id, reason: "changed-on-both" });
				}
				keptObjects.set(id, theirsObject);
			} else if (mineObject !== undefined) {
				keptObjects.set(id, mineObject);
			} else if (theirsObject !== undefined) {
				keptObjects.set(id, theirsObject);
			}
			continue;
		}
		if (mineObject === undefined && theirsObject === undefined) {
			continue;
		}
		if (mineObject === undefined && theirsObject !== undefined) {
			// Deleted here. It stays deleted unless the file changed it meanwhile
			if (
				!isSameContent(theirsObject, baseObject) ||
				isPlacementChanged(theirsObject, baseObject)
			) {
				addObjectConflict({ kind: "object", id, reason: "deleted-here" });
				keptObjects.set(id, theirsObject);
			}
			continue;
		}
		if (mineObject !== undefined && theirsObject === undefined) {
			if (
				!isSameContent(mineObject, baseObject) ||
				isPlacementChanged(mineObject, baseObject)
			) {
				addObjectConflict({ kind: "object", id, reason: "deleted-there" });
			}
			continue;
		}
		if (mineObject === undefined || theirsObject === undefined) {
			continue;
		}
		const { value, isConflict } = mergeValue(
			baseObject,
			mineObject,
			theirsObject,
			isSameContent,
		);
		if (isConflict) {
			addObjectConflict({ kind: "object", id, reason: "changed-on-both" });
		}
		keptObjects.set(id, value);
	}

	// The container each kept object goes into, merged apart from what it holds
	const parentIds = new Map<string, ContainerId>();
	const mergeParentId = (id: string): ContainerId => {
		const mineParentId = flatMine.objects.get(id)?.parentId;
		const theirsParentId = flatTheirs.objects.get(id)?.parentId;
		if (theirsParentId === undefined) {
			return mineParentId ?? null;
		}
		if (mineParentId === undefined) {
			return theirsParentId;
		}
		const baseParentId = flatBase.objects.get(id)?.parentId;
		if (baseParentId === undefined) {
			return theirsParentId;
		}
		const { value, isConflict } = mergeValue(
			baseParentId,
			mineParentId,
			theirsParentId,
			(left, right) => left === right,
		);
		if (isConflict) {
			addObjectConflict({ kind: "placement", id });
		}
		return value;
	};
	for (const id of keptObjects.keys()) {
		parentIds.set(id, mergeParentId(id));
	}

	// A container that did not survive hands its members to the one it was in, and
	// they take its place there. `anchorIds` remembers whose place that is
	const anchorIds = new Map<string, string>();
	const findRemovedParentId = (id: string): ContainerId =>
		findParentId(id, [flatTheirs, flatMine, flatBase]);
	const settleOrphans = (): void => {
		for (const [id, initialParentId] of parentIds) {
			let parentId = initialParentId;
			let anchorId: string | null = null;
			const visitedIds = new Set<string>();
			while (parentId !== null && !visitedIds.has(parentId)) {
				const parent = keptObjects.get(parentId);
				if (parent?.isContainer === true) {
					break;
				}
				visitedIds.add(parentId);
				anchorId = parentId;
				parentId =
					parent === undefined
						? findRemovedParentId(parentId)
						: (parentIds.get(parentId) ?? null);
			}
			if (parentId !== initialParentId) {
				parentIds.set(id, visitedIds.has(parentId ?? "") ? null : parentId);
				if (anchorId !== null) {
					anchorIds.set(id, anchorId);
				}
			}
		}
	};
	settleOrphans();

	// Each side is a tree, but taking one object's container from one side and
	// another's from the other can close a loop (each moved into the other). Every
	// object on such a loop goes back to the file's container, which is a lost move
	// for those the person had moved
	const findCycleIds = (): string[] => {
		const cycleIds: string[] = [];
		for (const id of parentIds.keys()) {
			const seenIds = new Set<string>([id]);
			let parentId = parentIds.get(id) ?? null;
			while (parentId !== null && !seenIds.has(parentId)) {
				seenIds.add(parentId);
				parentId = parentIds.get(parentId) ?? null;
			}
			if (parentId === id) {
				cycleIds.push(id);
			}
		}
		return cycleIds;
	};
	for (const id of findCycleIds()) {
		const mineParentId = flatMine.objects.get(id)?.parentId;
		const fileParentId = findParentId(id, [flatTheirs, flatMine]);
		if (
			mineParentId !== undefined &&
			mineParentId !== fileParentId &&
			mineParentId !== flatBase.objects.get(id)?.parentId
		) {
			addObjectConflict({ kind: "placement", id });
		}
		parentIds.set(id, fileParentId);
		anchorIds.delete(id);
	}
	settleOrphans();

	// The order of each container's members
	const membersByContainer = new Map<ContainerId, string[]>();
	for (const [id, parentId] of parentIds) {
		const members = membersByContainer.get(parentId) ?? [];
		members.push(id);
		membersByContainer.set(parentId, members);
	}
	const mergeMemberOrder = (containerId: ContainerId): string[] => {
		const memberSet = new Set(membersByContainer.get(containerId) ?? []);
		const baseIds = flatBase.memberIds.get(containerId);
		const mineIds = flatMine.memberIds.get(containerId);
		const theirsIds = flatTheirs.memberIds.get(containerId);
		const isReorderedInMine =
			baseIds !== undefined &&
			mineIds !== undefined &&
			!isSameRelativeOrder(mineIds, baseIds);
		const isReorderedInTheirs =
			baseIds !== undefined &&
			theirsIds !== undefined &&
			!isSameRelativeOrder(theirsIds, baseIds);
		if (
			isReorderedInMine &&
			isReorderedInTheirs &&
			theirsIds !== undefined &&
			mineIds !== undefined &&
			!isSameRelativeOrder(mineIds, theirsIds)
		) {
			conflicts.push({ kind: "order", id: containerId });
		}
		const [primaryIds, secondaryIds] =
			theirsIds === undefined || (isReorderedInMine && !isReorderedInTheirs)
				? [mineIds ?? [], theirsIds ?? []]
				: [theirsIds, mineIds ?? []];
		const orderedIds = primaryIds.filter((id) => memberSet.has(id));
		// What the other side added or moved in, placed next to its neighbours there
		for (const id of secondaryIds) {
			if (memberSet.has(id) && !orderedIds.includes(id)) {
				insertNextToSource(orderedIds, id, secondaryIds, id);
			}
		}
		// Members of a container that did not survive take its place
		for (const id of memberSet) {
			if (orderedIds.includes(id)) {
				continue;
			}
			const anchorId = anchorIds.get(id) ?? id;
			const sourceIds = [theirsIds, mineIds, baseIds].find(
				(ids) => ids?.includes(anchorId) === true,
			);
			if (sourceIds === undefined) {
				orderedIds.push(id);
			} else {
				insertNextToSource(orderedIds, id, sourceIds, anchorId);
			}
		}
		return orderedIds;
	};

	// Built from the leaves up, so that a container left with no members can go
	const buildMembers = (containerId: ContainerId): ObjectDoc[] => {
		const built: ObjectDoc[] = [];
		for (const id of mergeMemberOrder(containerId)) {
			const kept = keptObjects.get(id);
			if (kept === undefined) {
				continue;
			}
			if (!kept.isContainer) {
				built.push(kept.object as ObjectDoc);
				continue;
			}
			const children = buildMembers(id);
			if (children.length > 0) {
				const container: JsonRecord = {
					...kept.object,
					[CHILDREN_KEY]: children,
				};
				built.push(container as ObjectDoc);
			}
		}
		return built;
	};
	const root = buildMembers(null);

	// The document's own fields, per key, in theirs' order with mine's new keys after
	const mergedDoc: JsonRecord = {};
	const baseFields = base as unknown as JsonRecord;
	const mineFields = mine as unknown as JsonRecord;
	const theirsFields = theirs as unknown as JsonRecord;
	const fieldKeys = [
		...new Set([...Object.keys(theirsFields), ...Object.keys(mineFields)]),
	];
	for (const key of fieldKeys) {
		if (key === ROOT_KEY) {
			mergedDoc[key] = root;
			continue;
		}
		const { value, isConflict } = mergeValue(
			baseFields[key],
			mineFields[key],
			theirsFields[key],
			isSameJsonValue,
		);
		if (isConflict) {
			conflicts.push({ kind: "field", key });
		}
		if (value !== undefined) {
			mergedDoc[key] = value;
		}
	}
	return { doc: mergedDoc as CanvasDoc, conflicts };
};
