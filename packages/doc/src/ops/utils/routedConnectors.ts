import type {
	LayoutEdgeAnchor,
	LayoutGraphEdge,
	RoutedEdge,
} from "@jiscribe/layout";

import { buildEndpoint } from "./connectorEndpoints";
import { measureLabelBox } from "./connectorLabelBox";
import { readOwnerId } from "./layoutConnectorEnds";
import type { ObjectLocation } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import type { EdgeAnchorOutlineShape } from "../../model/objects/connector/calcEdgeAnchorOutlineRange";
import type { ConnectorDoc } from "../../model/objects/connector/ConnectorDoc";
import { toAnchorRegionSidePosition } from "../../model/objects/connector/convertEdgeAnchorRatio";
import type { OwnedEndpointRef } from "../../model/objects/types/EndpointRef";

/** The edge a connector with an owner at both ends is to the layout and to the router. */
export const buildConnectorGraphEdge = (
	connector: ConnectorDoc,
): LayoutGraphEdge => {
	const label = measureLabelBox(connector);
	return {
		id: connector.id,
		sourceId: readOwnerId(connector.source) as string,
		targetId: readOwnerId(connector.target) as string,
		...(label !== undefined ? { label } : {}),
	};
};

/**
 * The end to store for an anchor the layout or the router chose: a ratio of the owner's
 * anchor region, where the anchor is one of its box.
 *
 * @param locatedOwners - What locateObjects found for the doc, `ownerId` among the ids it looked for
 * @param shape - The owner's shape as resolveLayoutAnchorShape answers it
 * @throws DocOperationError when the stored anchor's side is not one of the four or its `t` is not a finite number in 0..1 (see buildAnchor)
 */
export const buildRoutedEndpoint = (
	locatedOwners: ReadonlyMap<string, ObjectLocation>,
	ownerId: string,
	anchor: LayoutEdgeAnchor,
	shape: EdgeAnchorOutlineShape,
	definitions: DocDefinitions,
): OwnedEndpointRef =>
	buildEndpoint(
		locatedOwners,
		ownerId,
		toAnchorRegionSidePosition(anchor, shape),
		definitions,
	);

/**
 * Write a connector's new ends and corners, mutating it in place, and drop its
 * `routing`: a straight line is what a centre anchor defaults to, and the right-angled
 * route is the one that reads.
 *
 * @param points - The corners in the form the op stores them
 * @param labelPlacement - Where the label goes, on the line where room was found for it and beside the line when the route is too short to hold it anywhere; undefined, or with no `labelPosition`, leaves the label where it is
 */
export const writeRoutedConnector = (
	connector: ConnectorDoc,
	source: ConnectorDoc["source"],
	target: ConnectorDoc["target"],
	points: ConnectorDoc["points"],
	labelPlacement: Pick<RoutedEdge, "labelPosition" | "labelOffset"> | undefined,
): void => {
	connector.source = source;
	connector.target = target;
	connector.points = points;
	if (
		connector.label !== undefined &&
		labelPlacement?.labelPosition !== undefined
	) {
		connector.label.position = labelPlacement.labelPosition;
		connector.label.offset = labelPlacement.labelOffset ?? 0;
	}
	delete connector.routing;
};
