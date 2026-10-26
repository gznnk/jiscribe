/**
 * What a DOM snapshot (export) renders while it clones the live SVG: the whole
 * object tree (`"all"`), or exactly the ids in the set — the set replaces the
 * viewport-culled set (ObjectsRenderer's `renderedObjectIds`), so it has to
 * hold the groups above every id it means to draw (see buildIdsWithAncestors).
 */
export type SnapshotRenderScope = "all" | ReadonlySet<string>;
