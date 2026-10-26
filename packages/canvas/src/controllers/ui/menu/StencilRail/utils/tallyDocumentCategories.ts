import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { collectCowChangedKeys } from "../../../../utils/cowObjects";
import type { Stencil } from "../../../objects/Stencil";
import type { ResolvedStencilCategory } from "../../StencilLibrary/utils/resolveStencilCategory";

/**
 * Object type → the ids of the library sections listing a preset of that type,
 * in section order: what tells which categories a document uses.
 *
 * @param librarySections - `stencilLibrary.sections` resolved against the
 *   registry; only the presets a section lists count, not the ones its `search`
 *   reaches beyond them
 * @param railPresets - The rail's presets as resolved (`rail.presetIds` or the
 *   default); every type one of them creates is left out of the lookup (the
 *   rule: `CanvasRailConfig.presetIds`)
 * @returns Empty when every listed type is a rail preset's, or there is no library
 */
export const buildCategoryIdsByObjectType = (
	librarySections: readonly ResolvedStencilCategory[],
	railPresets: readonly Stencil[],
): ReadonlyMap<ObjectType, readonly string[]> => {
	const railObjectTypes = new Set(
		railPresets.map((preset) => preset.objectType),
	);
	const categoryIdsByObjectType = new Map<ObjectType, string[]>();
	for (const { category, presets } of librarySections) {
		for (const preset of presets) {
			if (railObjectTypes.has(preset.objectType)) {
				continue;
			}
			const categoryIds = categoryIdsByObjectType.get(preset.objectType);
			if (categoryIds === undefined) {
				categoryIdsByObjectType.set(preset.objectType, [category.id]);
			} else if (!categoryIds.includes(category.id)) {
				// A section listing two presets of one type names it once.
				categoryIds.push(category.id);
			}
		}
	}
	return categoryIdsByObjectType;
};

/**
 * The library categories a document uses, with what they were counted from:
 * the next call on a copy-on-write step of the same map adjusts the counts for
 * the ids the step wrote instead of walking every object again.
 */
export type DocumentCategoryTally = {
	/** The object map counted; the next call diffs against it. */
	objects: Readonly<Record<string, ObjectState>>;
	/** The lookup the counts were taken through; another one forces a full walk. */
	categoryIdsByObjectType: ReadonlyMap<ObjectType, readonly string[]>;
	/** The sections the ranking follows for ties; other ones force a full walk. */
	librarySections: readonly ResolvedStencilCategory[];
	/** Objects counted per category id; a category counting none is absent. */
	objectCountByCategoryId: ReadonlyMap<string, number>;
	/**
	 * The categories counting an object, most objects first, ties in section
	 * order. Kept as the previous tally's array while the ids and their order
	 * are unchanged.
	 */
	rankedCategoryIds: readonly string[];
};

const countObjectsByCategoryId = (
	objects: Readonly<Record<string, ObjectState>>,
	categoryIdsByObjectType: ReadonlyMap<ObjectType, readonly string[]>,
): Map<string, number> => {
	const objectCountByCategoryId = new Map<string, number>();
	if (categoryIdsByObjectType.size === 0) {
		return objectCountByCategoryId;
	}
	for (const objectId in objects) {
		const categoryIds = categoryIdsByObjectType.get(objects[objectId].type);
		for (const categoryId of categoryIds ?? []) {
			objectCountByCategoryId.set(
				categoryId,
				(objectCountByCategoryId.get(categoryId) ?? 0) + 1,
			);
		}
	}
	return objectCountByCategoryId;
};

/**
 * The previous counts adjusted for the ids a copy-on-write step wrote, or null
 * when the two maps share no backing Record (a load, a command, and the end of
 * each gesture, which materializes the drag's view: handleGesture) and only a
 * full walk can tell. Hands `previousCounts` back when no written id changed type,
 * which is every step of a drag.
 */
const adjustObjectCountsByCategoryId = (
	objects: Readonly<Record<string, ObjectState>>,
	previousObjects: Readonly<Record<string, ObjectState>>,
	previousCounts: ReadonlyMap<string, number>,
	categoryIdsByObjectType: ReadonlyMap<ObjectType, readonly string[]>,
): ReadonlyMap<string, number> | null => {
	const changedIds = collectCowChangedKeys(objects, previousObjects);
	if (changedIds === null) {
		return null;
	}
	let adjustedCounts: Map<string, number> | null = null;
	for (const objectId of changedIds) {
		// An id may be on one side only: added, or written by the older view alone.
		const previousObject: ObjectState | undefined = previousObjects[objectId];
		const nextObject: ObjectState | undefined = objects[objectId];
		if (previousObject?.type === nextObject?.type) {
			continue;
		}
		for (const [object, delta] of [
			[previousObject, -1],
			[nextObject, 1],
		] as const) {
			const categoryIds =
				object === undefined
					? undefined
					: categoryIdsByObjectType.get(object.type);
			for (const categoryId of categoryIds ?? []) {
				adjustedCounts ??= new Map(previousCounts);
				const objectCount = (adjustedCounts.get(categoryId) ?? 0) + delta;
				if (objectCount === 0) {
					adjustedCounts.delete(categoryId);
				} else {
					adjustedCounts.set(categoryId, objectCount);
				}
			}
		}
	}
	return adjustedCounts ?? previousCounts;
};

const isSameCategoryIdOrder = (
	previousIds: readonly string[],
	nextIds: readonly string[],
): boolean =>
	previousIds.length === nextIds.length &&
	previousIds.every((categoryId, index) => categoryId === nextIds[index]);

/**
 * Counts the document's objects per library category and ranks the categories
 * that count one: each object of a type in `categoryIdsByObjectType` counts
 * once toward every category listed for it, and the categories come most
 * objects first, ties in section order.
 *
 * Runs on every change of `state.objects`, which is every step of a drag. When
 * `objects` is a copy-on-write step of `previousTally.objects` under the same
 * lookup and sections, only the ids the step wrote are looked at
 * (collectCowChangedKeys); otherwise every object is walked once.
 *
 * @param objects - The canvas state's flat object map, group children included
 *   (they are absent from `rootIds` only), so every object is counted once
 * @param categoryIdsByObjectType - From {@link buildCategoryIdsByObjectType}
 *   over the same `librarySections`
 * @param librarySections - Breaks ties: categories counting as many objects
 *   keep their section order
 * @param previousTally - What the last call returned, or null for the first;
 *   its `rankedCategoryIds` array is reused while the ids and their order come
 *   out the same, so a memoized consumer keeps its props through a drag
 * @returns `previousTally` itself when `objects` is its own map under the same
 *   lookup and sections; a new tally otherwise
 */
export const tallyDocumentCategories = (
	objects: Readonly<Record<string, ObjectState>>,
	categoryIdsByObjectType: ReadonlyMap<ObjectType, readonly string[]>,
	librarySections: readonly ResolvedStencilCategory[],
	previousTally: DocumentCategoryTally | null,
): DocumentCategoryTally => {
	const isSameLookupAndSections =
		previousTally !== null &&
		previousTally.categoryIdsByObjectType === categoryIdsByObjectType &&
		previousTally.librarySections === librarySections;
	if (isSameLookupAndSections && previousTally.objects === objects) {
		return previousTally;
	}

	const adjustedCounts = isSameLookupAndSections
		? adjustObjectCountsByCategoryId(
				objects,
				previousTally.objects,
				previousTally.objectCountByCategoryId,
				categoryIdsByObjectType,
			)
		: null;
	if (
		isSameLookupAndSections &&
		adjustedCounts === previousTally.objectCountByCategoryId
	) {
		return { ...previousTally, objects };
	}
	const objectCountByCategoryId =
		adjustedCounts ??
		countObjectsByCategoryId(objects, categoryIdsByObjectType);

	// Section order first, then a stable sort by count, which keeps it for ties.
	const rankedIds = librarySections
		.flatMap(({ category }) => {
			const objectCount = objectCountByCategoryId.get(category.id);
			return objectCount === undefined
				? []
				: [{ categoryId: category.id, objectCount }];
		})
		.sort((left, right) => right.objectCount - left.objectCount)
		.map(({ categoryId }) => categoryId);
	const previousRankedIds = previousTally?.rankedCategoryIds;

	return {
		objects,
		categoryIdsByObjectType,
		librarySections,
		objectCountByCategoryId,
		rankedCategoryIds:
			previousRankedIds !== undefined &&
			isSameCategoryIdOrder(previousRankedIds, rankedIds)
				? previousRankedIds
				: rankedIds,
	};
};
