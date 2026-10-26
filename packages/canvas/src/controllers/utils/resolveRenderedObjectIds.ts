import type { SnapshotRenderScope } from "./SnapshotRenderScope";

/**
 * The ids ObjectsRenderer draws: the viewport-culled set, or what a running
 * snapshot asked for in its place.
 *
 * @param snapshotRenderScope - The running snapshot's scope, or null while none runs
 * @param culledObjectIds - The objects on screen (useVisibleObjectIds)
 * @returns undefined for an `"all"` snapshot, which renders the full tree
 */
export const resolveRenderedObjectIds = (
	snapshotRenderScope: SnapshotRenderScope | null,
	culledObjectIds: ReadonlySet<string>,
): ReadonlySet<string> | undefined => {
	if (snapshotRenderScope === null) {
		return culledObjectIds;
	}
	if (snapshotRenderScope === "all") {
		return undefined;
	}
	return snapshotRenderScope;
};
