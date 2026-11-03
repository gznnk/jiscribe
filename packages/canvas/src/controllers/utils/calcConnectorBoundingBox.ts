import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorLabel,
} from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { calcPolyBoundingBox } from "@jiscribe/geometry";
import type { BoundingBox, Point } from "@jiscribe/geometry";

import {
	resolveArrowHeadReaches,
	unionArrowHeadsBoundingBox,
} from "./unionArrowHeadsBoundingBox";
import type {
	ConnectorRouteRegistries,
	VisualExtentRegistries,
} from "./VisualExtentRegistries";
import {
	calcConnectorPathBound,
	listConnectorPathPoints,
	resolveConnectorPoints,
	resolveConnectorPointsCached,
	resolveEndpointOwner,
} from "../../rendering/objects/connector/geometry/endpoints";
import { calcConnectorLabelAnchor } from "../../rendering/objects/connector/geometry/label/calcConnectorLabelAnchor";
import { resolveConnectorLabelBox } from "../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectGeometryKeyRegistry } from "../../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";

/**
 * Collects every point along a connector: the dynamically resolved endpoints
 * (including outline adjustment) plus the intermediate waypoints.
 *
 * Returns null if the endpoints cannot be resolved (e.g. a referenced object
 * was removed).
 *
 * @param connector - The connector whose path is collected
 * @param objects - The object map, used to resolve the endpoint owners
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry. Pass it whenever the points
 *   are compared against a pointer position: omitting it approximates an outline shape by
 *   its bounding box, putting the path off the drawn one
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry, the companion of
 *   `outlineRegistry`; omitted = edge anchors centered on the full bounding box
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry, the other
 *   companion of `outlineRegistry`; omitted = an endpoint on a type-declared anchor collapses
 *   onto the owner's center
 * @param geometryKeyRegistry - Per-canvas ObjectGeometryKeyRegistry; with it and the three
 *   above the route comes from the cache the renderer and viewport culling fill
 *   (resolveConnectorPointsCached), omitted = routed afresh
 * @returns A new array each call, whose point objects are shared with the renderer's cached
 *   route when all four registries are passed — copy a point before writing to it
 */
export const collectConnectorPoints = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
	outlineRegistry?: Pick<ObjectOutlineRegistry, "get"> | null,
	anchorRegionRegistry?: Pick<ObjectAnchorRegionRegistry, "get"> | null,
	extraConnectPointsRegistry?: Pick<
		ObjectExtraConnectPointsRegistry,
		"get"
	> | null,
	geometryKeyRegistry?: Pick<ObjectGeometryKeyRegistry, "get"> | null,
): Point[] | null => {
	const sourceObj = resolveEndpointOwner(objects, connector.source);
	const targetObj = resolveEndpointOwner(objects, connector.target);

	// With all four registries this is the route the renderer and viewport
	// culling resolve (resolveConnectorPointsCached), so an unchanged connector
	// is not routed again. The answer is shared with them: callers read the
	// points and never write to them.
	const resolved =
		outlineRegistry &&
		anchorRegionRegistry &&
		extraConnectPointsRegistry &&
		geometryKeyRegistry
			? resolveConnectorPointsCached(
					connector,
					sourceObj,
					targetObj,
					outlineRegistry,
					anchorRegionRegistry,
					extraConnectPointsRegistry,
					geometryKeyRegistry,
				)
			: resolveConnectorPoints(
					connector,
					sourceObj,
					targetObj,
					outlineRegistry,
					anchorRegionRegistry,
					extraConnectPointsRegistry,
				);
	if (!resolved) {
		return null;
	}

	return listConnectorPathPoints(resolved);
};

/**
 * {@link collectConnectorPoints} through a whole registries bundle: the path as
 * the renderer draws it, read from the route cache it fills.
 *
 * @param connector - The connector whose path is collected
 * @param objects - The object map, used to resolve the endpoint owners
 * @param registries - Per-canvas registries; a bundle with `objectVisualBounds`
 *   (VisualExtentRegistries, ICanvasRegistries) is accepted and that one is not read
 * @returns null if an endpoint cannot be resolved; otherwise a new array whose point
 *   objects are shared with the renderer's cached route — copy a point before writing to it
 */
export const collectDrawnConnectorPoints = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
	registries: ConnectorRouteRegistries,
): Point[] | null =>
	collectConnectorPoints(
		connector,
		objects,
		registries.objectOutline,
		registries.objectAnchorRegion,
		registries.objectExtraConnectPoints,
		registries.objectGeometryKey,
	);

/**
 * Two opposite corners of the label box, which is enough to widen an
 * axis-aligned bound (the label is never rotated). Empty when there is nothing
 * to draw or the anchor is unresolvable.
 */
const collectLabelCorners = (
	label: ConnectorLabel | undefined,
	connectorPoints: readonly Point[],
): Point[] => {
	if (!label || label.text === "") {
		return [];
	}

	const anchor = calcConnectorLabelAnchor(
		connectorPoints,
		label.position,
		label.offset,
	);
	if (!anchor) {
		return [];
	}

	const { width, height } = resolveConnectorLabelBox(label);
	return [
		{ x: anchor.x - width / 2, y: anchor.y - height / 2 },
		{ x: anchor.x + width / 2, y: anchor.y + height / 2 },
	];
};

/**
 * Computes the bounding box of an entire connector, path and label together.
 *
 * Dynamically resolves the endpoints and returns a range that also covers the
 * intermediate waypoints. In orthogonal routing the bend points are included in
 * the waypoints, so they are covered by the range as well.
 *
 * A non-empty label is part of the connector's extent: its box (axis aligned,
 * centered on the anchor derived from `label.position` / `label.offset`) is
 * unioned in, so zoom-to-fit and the export viewBox do not crop it.
 *
 * @param connector - The connector to measure
 * @param objects - The object map, used to resolve the endpoint owners
 * @param visualExtentRegistries - Per-canvas registries the path is resolved
 *   through, as the renderer draws it, and the arrowheads are sized through
 *   (calcConnectorDrawnBoundingBox): the box is then the drawn extent. Omitted =
 *   no arrowheads, and the path is resolved without them, which is not the drawn
 *   route: an end on a type-declared anchor collapses onto the owner's center, so
 *   a route that loops outside the owners falls outside the box. Every consumer
 *   framing the drawing must pass them
 * @returns null if the endpoints cannot be resolved (e.g. a referenced object was removed)
 */
export const calcConnectorBoundingBox = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
	visualExtentRegistries?: VisualExtentRegistries | null,
): BoundingBox | null => {
	const connectorPoints = visualExtentRegistries
		? collectDrawnConnectorPoints(connector, objects, visualExtentRegistries)
		: collectConnectorPoints(connector, objects);
	if (!connectorPoints) {
		return null;
	}

	return visualExtentRegistries
		? calcConnectorDrawnBoundingBox(
				connector,
				connectorPoints,
				visualExtentRegistries.objectShapeStyleDefaults,
			)
		: calcConnectorPathBoundingBox(connector, connectorPoints);
};

/**
 * {@link calcConnectorBoundingBox} over a path the caller already resolved, the
 * label's box unioned in the same way.
 *
 * @param connector - The connector the path belongs to; only its `label` is read
 * @param connectorPoints - The path, source → waypoints → target, in world coordinates
 * @returns The box covering the path and the label; null only for an empty path
 */
export const calcConnectorPathBoundingBox = (
	connector: ConnectorState,
	connectorPoints: readonly Point[],
): BoundingBox | null =>
	calcPolyBoundingBox([
		...connectorPoints,
		...collectLabelCorners(connector.label, connectorPoints),
	]);

/**
 * {@link calcConnectorPathBoundingBox} widened by the arrowheads drawn at the
 * path's two ends (unionArrowHeadsBoundingBox): the connector's drawn extent,
 * for the visual-extent consumers. The hit test and the selection frame keep
 * the path's own box.
 *
 * @param connector - The connector the path belongs to; its label, stroke width and arrow fields are read
 * @param connectorPoints - The path, source → waypoints → target, in world coordinates; the first and last points are the heads' tips
 * @param shapeStyleDefaults - The canvas's shape-style defaults, which resolve the unset fields as the renderer does
 * @returns null only for an empty path
 */
export const calcConnectorDrawnBoundingBox = (
	connector: ConnectorState,
	connectorPoints: readonly Point[],
	shapeStyleDefaults: VisualExtentRegistries["objectShapeStyleDefaults"],
): BoundingBox | null => {
	const pathBox = calcConnectorPathBoundingBox(connector, connectorPoints);
	if (!pathBox) {
		return null;
	}
	return unionArrowHeadsBoundingBox(
		pathBox,
		connector,
		connectorPoints[0],
		connectorPoints[connectorPoints.length - 1],
		shapeStyleDefaults,
	);
};

/**
 * A box that contains {@link calcConnectorDrawnBoundingBox} of the connector's
 * drawn path, found without routing it (calcConnectorPathBound), so a caller
 * that only needs to know the connector is somewhere else can skip the router.
 * The label is bounded by its own box around any anchor on the path: the anchor
 * is a point of the path moved at most `|offset|` along each axis. The
 * arrowheads are bounded by the larger head's reach around the whole path, the
 * tips not being known without routing.
 *
 * @param connector - The connector to bound
 * @param sourceOwner - The source endpoint's owner as resolveEndpointOwner returns it; null for a free endpoint or a missing owner
 * @param targetOwner - The target endpoint's owner, likewise
 * @param visualExtentRegistries - The registries the path is drawn through; the three
 *   geometry ones the endpoints resolve through and the shape-style defaults the heads
 *   are sized through are read
 * @returns null where no bound is known and the path has to be resolved instead:
 *   an endpoint that does not resolve, or a label whose offset or measured box is not finite
 */
export const calcConnectorExtentBound = (
	connector: ConnectorState,
	sourceOwner: ObjectState | null,
	targetOwner: ObjectState | null,
	visualExtentRegistries: VisualExtentRegistries,
): BoundingBox | null => {
	const pathBound = calcConnectorPathBound(
		connector,
		sourceOwner,
		targetOwner,
		visualExtentRegistries.objectOutline,
		visualExtentRegistries.objectAnchorRegion,
		visualExtentRegistries.objectExtraConnectPoints,
	);
	if (!pathBound) {
		return null;
	}

	const { startReach, endReach } = resolveArrowHeadReaches(
		connector,
		visualExtentRegistries.objectShapeStyleDefaults,
	);
	const arrowReach = Math.max(startReach, endReach);
	const label = connector.label;
	let reachX = arrowReach;
	let reachY = arrowReach;
	if (label && label.text !== "") {
		const offset = Math.abs(label.offset ?? CONNECTOR_LABEL_DEFAULTS.offset);
		const { width, height } = resolveConnectorLabelBox(label);
		// 1 unit of slack for the float error of interpolating the anchor along a segment.
		reachX = Math.max(reachX, offset + width / 2 + 1);
		reachY = Math.max(reachY, offset + height / 2 + 1);
	}
	if (!Number.isFinite(reachX) || !Number.isFinite(reachY)) {
		return null;
	}
	return {
		left: pathBound.left - reachX,
		top: pathBound.top - reachY,
		right: pathBound.right + reachX,
		bottom: pathBound.bottom + reachY,
	};
};
