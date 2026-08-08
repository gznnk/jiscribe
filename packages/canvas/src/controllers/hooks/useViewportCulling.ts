import { useCallback, useState } from "react";
import { flushSync } from "react-dom";

import { useVisibleObjectIds } from "./useVisibleObjectIds";
import type { ObjectVisualBoundsRegistry } from "../../presentations/objects/registry/ObjectVisualBoundsRegistry";
import type { Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";

type UseViewportCullingResult = {
	/**
	 * IDs to render (see useVisibleObjectIds), or undefined while culling is
	 * suspended — CanvasView renders the full tree then.
	 */
	visibleObjectIds: ReadonlySet<string> | undefined;
	/**
	 * Runs the snapshot with culling suspended, so paths that clone the live
	 * SVG DOM (export) see every object. flushSync commits the full tree
	 * before the snapshot runs; the synchronous part of the snapshot must
	 * complete the clone.
	 */
	withCullingSuspended: <T>(snapshot: () => T) => T;
};

/**
 * Owns viewport culling (issue #212): derives the visible-object set and
 * exposes the suspension used by DOM-snapshotting paths.
 */
export const useViewportCulling = (
	objects: Record<string, ObjectState>,
	rootIds: string[],
	viewport: Viewport,
	textEditObjectId: string | null,
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">,
): UseViewportCullingResult => {
	const visibleObjectIds = useVisibleObjectIds(
		objects,
		rootIds,
		viewport,
		textEditObjectId,
		visualBounds,
	);

	const [isCullingSuspended, setIsCullingSuspended] = useState(false);
	const withCullingSuspended = useCallback(<T>(snapshot: () => T): T => {
		flushSync(() => setIsCullingSuspended(true));
		try {
			return snapshot();
		} finally {
			setIsCullingSuspended(false);
		}
	}, []);

	return {
		visibleObjectIds: isCullingSuspended ? undefined : visibleObjectIds,
		withCullingSuspended,
	};
};
