import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
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
 *   default). Every type one of them creates is left out of the lookup: a
 *   section listing a variant of it (flowchart's `process` is a `rect`) would
 *   otherwise be claimed by every plain shape drawn from the rail
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

const isSameCategoryIdOrder = (
	previousIds: readonly string[],
	nextIds: readonly string[],
): boolean =>
	previousIds.length === nextIds.length &&
	previousIds.every((categoryId, index) => categoryId === nextIds[index]);

/**
 * The library categories a document uses, most objects first: each object of
 * a type in `categoryIdsByObjectType` counts once toward every category listed
 * for it.
 *
 * @param objects - The canvas state's flat object map, group children included
 *   (they are absent from `rootIds` only), so every object is counted once
 * @param categoryIdsByObjectType - From {@link buildCategoryIdsByObjectType}
 *   over the same `librarySections`
 * @param librarySections - Breaks ties: categories counting as many objects
 *   keep their section order
 * @param previousRankedIds - What the last call returned, handed back when the
 *   ids and their order come out the same, so a memoized consumer keeps its
 *   props through a drag that moves objects without changing their types
 * @returns `previousRankedIds` itself when unchanged; empty when the document
 *   uses no category
 */
export const rankDocumentCategoryIds = (
	objects: Readonly<Record<string, ObjectState>>,
	categoryIdsByObjectType: ReadonlyMap<ObjectType, readonly string[]>,
	librarySections: readonly ResolvedStencilCategory[],
	previousRankedIds: readonly string[],
): readonly string[] => {
	const objectCountByCategoryId = new Map<string, number>();
	if (categoryIdsByObjectType.size > 0) {
		for (const objectId in objects) {
			const categoryIds = categoryIdsByObjectType.get(objects[objectId].type);
			if (categoryIds === undefined) {
				continue;
			}
			for (const categoryId of categoryIds) {
				objectCountByCategoryId.set(
					categoryId,
					(objectCountByCategoryId.get(categoryId) ?? 0) + 1,
				);
			}
		}
	}

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

	return isSameCategoryIdOrder(previousRankedIds, rankedIds)
		? previousRankedIds
		: rankedIds;
};
