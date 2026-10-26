import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectGeometryKeyRegistry } from "../../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";

/**
 * The registries an object's drawn extent is measured through (zoom-to-fit, the
 * export viewBox, the scroll wall, viewport culling, zoom-to-selection, object
 * menu placement): the canvas bundle (ICanvasRegistries) is structurally
 * assignable to it, so those consumers pass their whole bundle.
 */
export type VisualExtentRegistries = {
	/** Widens a frame shape's box by what it draws outside its geometry (an actor's label, say). */
	objectVisualBounds: Pick<ObjectVisualBoundsRegistry, "get">;
	/** Puts a connector's endpoints on the owner's drawn silhouette. */
	objectOutline: Pick<ObjectOutlineRegistry, "get">;
	/** Recenters a tapering silhouette's edge anchors in a connector's path. */
	objectAnchorRegion: Pick<ObjectAnchorRegionRegistry, "get">;
	/**
	 * Resolves an endpoint on a type-declared anchor (an ER entity's column side);
	 * without it the end collapses onto the owner's center and an orthogonal route
	 * looping outside the owners is missed.
	 */
	objectExtraConnectPoints: Pick<ObjectExtraConnectPointsRegistry, "get">;
	/** Lets a connector's path come from the cache the renderer fills (resolveConnectorPointsCached). */
	objectGeometryKey: Pick<ObjectGeometryKeyRegistry, "get">;
};

/**
 * The registries a connector's path is resolved through as the renderer routes
 * it, without the frame decoration: what a consumer working on the shapes'
 * geometry (the multi-select frame, the hit test, which also reads the outline as
 * a frame's silhouette) passes so a connector counts where it is drawn. The
 * canvas bundle (ICanvasRegistries) is structurally assignable to it.
 */
export type ConnectorRouteRegistries = Omit<
	VisualExtentRegistries,
	"objectVisualBounds"
>;
