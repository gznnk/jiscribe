import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { calcPolyBoundingBox } from "@jiscribe/geometry";
import type { BoundingBox, Point } from "@jiscribe/geometry";

import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import {
	listConnectorPathPoints,
	resolveConnectorPoints,
	resolveConnectorPointsCached,
	resolveEndpointOwner,
} from "../../connectors/endpoints";
import { calcConnectorLabelAnchor } from "../../connectors/label/calcConnectorLabelAnchor";
import { resolveConnectorLabelBox } from "../../rendering/objects/connector/ConnectorLabel/utils/connectorLabelLayout";
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
 *   through, as the renderer draws it; only the four geometry ones are read. Omitted =
 *   the path is resolved without them, which is not the drawn route: an end on a
 *   type-declared anchor collapses onto the owner's center, so a route that loops
 *   outside the owners falls outside the box. Every consumer framing the drawing
 *   must pass them
 * @returns null if the endpoints cannot be resolved (e.g. a referenced object was removed)
 */
export const calcConnectorBoundingBox = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
	visualExtentRegistries?: VisualExtentRegistries | null,
): BoundingBox | null => {
	const connectorPoints = visualExtentRegistries
		? collectConnectorPoints(
				connector,
				objects,
				visualExtentRegistries.objectOutline,
				visualExtentRegistries.objectAnchorRegion,
				visualExtentRegistries.objectExtraConnectPoints,
				visualExtentRegistries.objectGeometryKey,
			)
		: collectConnectorPoints(connector, objects);
	if (!connectorPoints) {
		return null;
	}

	return calcConnectorPathBoundingBox(connector, connectorPoints);
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
