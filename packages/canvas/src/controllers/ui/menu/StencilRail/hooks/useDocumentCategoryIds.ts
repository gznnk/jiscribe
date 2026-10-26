import { useMemo, useRef } from "react";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { StencilRegistry } from "../../../objects/StencilRegistry";
import type { ResolvedStencilCategory } from "../../StencilLibrary/utils/resolveStencilCategory";
import {
	buildCategoryIdsByObjectType,
	rankDocumentCategoryIds,
} from "../utils/rankDocumentCategoryIds";

/**
 * The library categories the open document uses, most objects first
 * (rankDocumentCategoryIds): what the rail adds below its pins and what the
 * catalog marks as in the diagram.
 *
 * Derived on every change of `objects`, which is every step of a drag, so the
 * walk is one pass over the map; the result keeps its reference while the ids
 * and their order stay the same, so the memoized rail and panels hold.
 *
 * @param objects - The canvas state's committed objects (`state.objects`)
 * @param librarySections - `stencilLibrary.sections` resolved against the registry (useResolvedStencilLibrary)
 * @param railPresetIds - The rail's presets as the host declared them, the default already applied; the types they create count toward no category
 * @param stencil - Registry resolving `railPresetIds` to the types they create
 */
export const useDocumentCategoryIds = (
	objects: Readonly<Record<string, ObjectState>>,
	librarySections: readonly ResolvedStencilCategory[],
	railPresetIds: readonly string[],
	stencil: StencilRegistry,
): readonly string[] => {
	const categoryIdsByObjectType = useMemo(
		() =>
			buildCategoryIdsByObjectType(
				librarySections,
				railPresetIds
					.map((presetId) => stencil.get(presetId))
					.filter((preset) => preset !== undefined),
			),
		[librarySections, railPresetIds, stencil],
	);

	const rankedIdsRef = useRef<readonly string[]>([]);
	return useMemo(() => {
		rankedIdsRef.current = rankDocumentCategoryIds(
			objects,
			categoryIdsByObjectType,
			librarySections,
			rankedIdsRef.current,
		);
		return rankedIdsRef.current;
	}, [objects, categoryIdsByObjectType, librarySections]);
};
