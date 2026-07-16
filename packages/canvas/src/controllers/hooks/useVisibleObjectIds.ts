import { useMemo, useRef } from "react";

import type { Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { calcVisibleObjectIds } from "../utils/calcVisibleObjectIds";
import type { VisibilityBBoxCache } from "../utils/calcVisibleObjectIds";

/**
 * Derives the set of object IDs to render under the current viewport
 * (see calcVisibleObjectIds), recomputing each object's bbox only when its
 * state identity changed since the previous render.
 *
 * The returned Set keeps its identity while the membership is unchanged, so
 * a pure pan/zoom that crosses no object boundary does not re-render
 * ObjectsRenderer (its memo still bails out).
 */
export const useVisibleObjectIds = (
	objects: Record<string, ObjectState>,
	rootIds: string[],
	viewport: Viewport,
	textEditObjectId: string | null,
): ReadonlySet<string> => {
	const bboxCacheRef = useRef<VisibilityBBoxCache>(new Map());
	const prevVisibleIdsRef = useRef<ReadonlySet<string> | null>(null);

	return useMemo(() => {
		const { visibleIds, bboxCache } = calcVisibleObjectIds({
			objects,
			rootIds,
			viewport,
			textEditObjectId,
			prevCache: bboxCacheRef.current,
		});
		bboxCacheRef.current = bboxCache;

		const prevVisibleIds = prevVisibleIdsRef.current;
		if (prevVisibleIds && prevVisibleIds.size === visibleIds.size) {
			let isSameMembership = true;
			for (const id of visibleIds) {
				if (!prevVisibleIds.has(id)) {
					isSameMembership = false;
					break;
				}
			}
			if (isSameMembership) {
				return prevVisibleIds;
			}
		}
		prevVisibleIdsRef.current = visibleIds;
		return visibleIds;
	}, [objects, rootIds, viewport, textEditObjectId]);
};
