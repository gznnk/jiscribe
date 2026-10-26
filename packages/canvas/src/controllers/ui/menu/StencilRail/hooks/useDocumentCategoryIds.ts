import { useMemo, useRef } from "react";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { StencilRegistry } from "../../../objects/StencilRegistry";
import type { ResolvedStencilCategory } from "../../StencilLibrary/utils/resolveStencilCategory";
import {
	buildCategoryIdsByObjectType,
	tallyDocumentCategories,
	type DocumentCategoryTally,
} from "../utils/tallyDocumentCategories";

/**
 * The library categories the open document uses, most objects first
 * (tallyDocumentCategories): what the rail adds below its pins and what the
 * catalog marks as in the diagram.
 *
 * The last tally is kept, so a drag step is counted from the ids it wrote, and
 * the result keeps its reference while the ids and their order stay the same,
 * so the memoized rail and panels hold.
 *
 * @param objects - The canvas state's object map (`state.objects`), a copy-on-write view during a drag
 * @param librarySections - `stencilLibrary.sections` resolved against the registry (useResolvedStencilLibrary)
 * @param railPresetIds - The rail's presets as the host declared them, the default already applied (what their types do: buildCategoryIdsByObjectType)
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

	const tallyRef = useRef<DocumentCategoryTally | null>(null);
	return useMemo(() => {
		tallyRef.current = tallyDocumentCategories(
			objects,
			categoryIdsByObjectType,
			librarySections,
			tallyRef.current,
		);
		return tallyRef.current.rankedCategoryIds;
	}, [objects, categoryIdsByObjectType, librarySections]);
};
