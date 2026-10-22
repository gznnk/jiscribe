import { useCallback, useState } from "react";
import { flushSync } from "react-dom";

import type { WritableCanvasZoomStore } from "./utils/createCanvasZoomStore";
import type { SnapshotRenderScope } from "../utils/SnapshotRenderScope";

type UseSnapshotRenderScopeResult = {
	/**
	 * What the running snapshot asked to be rendered, or null while none runs
	 * (see resolveRenderedObjectIds).
	 */
	snapshotRenderScope: SnapshotRenderScope | null;
	/**
	 * Runs the snapshot with `renderScope` rendered in place of the culled set, so
	 * paths that clone the live SVG DOM (export) see every object, or exactly the
	 * ones they mean to draw. flushSync commits that tree before the snapshot runs;
	 * the synchronous part of the snapshot must complete the clone. The scope is
	 * cleared afterwards, also when the snapshot throws.
	 */
	withSnapshotRenderScope: <T>(
		renderScope: SnapshotRenderScope,
		snapshot: () => T,
	) => T;
};

/**
 * Owns what a DOM snapshot (export) renders while it clones the live SVG.
 *
 * @param zoomStore - Raised into its snapshot state for the same span, so a text
 *   hidden for being too small at the current zoom is drawn into the clone
 */
export const useSnapshotRenderScope = (
	zoomStore: WritableCanvasZoomStore,
): UseSnapshotRenderScopeResult => {
	const [snapshotRenderScope, setSnapshotRenderScope] =
		useState<SnapshotRenderScope | null>(null);
	const withSnapshotRenderScope = useCallback(
		<T>(renderScope: SnapshotRenderScope, snapshot: () => T): T => {
			flushSync(() => {
				setSnapshotRenderScope(renderScope);
				zoomStore.setSnapshotRendering(true);
			});
			try {
				return snapshot();
			} finally {
				setSnapshotRenderScope(null);
				zoomStore.setSnapshotRendering(false);
			}
		},
		[zoomStore],
	);
	return { snapshotRenderScope, withSnapshotRenderScope };
};
