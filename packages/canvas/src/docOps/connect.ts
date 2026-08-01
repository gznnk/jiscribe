import type { Point } from "@workspace/geometry";

import {
	type AnchorHandleId,
	buildEndpoint,
	requireConnectable,
} from "./connectorEndpoints";
import { generateUniqueId } from "./ids";
import type { DocDefinitions } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ArrowType } from "../schemas/objects/types/ArrowType";
import {
	type ConnectorRouting,
	defaultRoutingForAnchors,
} from "../schemas/objects/types/ConnectorRouting";

export type ConnectParams = {
	/** Id of the object the connector leaves; must exist in the root tree and be connectable. */
	sourceId: string;
	/** Id of the object the connector enters; must exist in the root tree and be connectable. */
	targetId: string;
	/** Where the connector leaves the source; omitted means "center". */
	sourceAnchor?: AnchorHandleId;
	/** Where the connector enters the target; omitted means "center". */
	targetAnchor?: AnchorHandleId;
	/** Arrowhead at the source end; omitted leaves the property off the doc entirely. */
	startArrow?: ArrowType;
	/** Arrowhead at the target end; omitted leaves the property off the doc entirely. */
	endArrow?: ArrowType;
	/** Label drawn on the line; omitted or empty leaves the connector unlabelled. */
	label?: string;
	/**
	 * Line shape; omitted derives it from the anchors, which is what makes a
	 * centre-to-centre connector straight.
	 */
	routing?: ConnectorRouting;
	/**
	 * Corners the route bends at, in world coordinates, source → target; endpoint
	 * coordinates are not included. Omitted or empty lets the engine route the whole path.
	 */
	points?: readonly Point[];
};

/**
 * Connect two objects with a connector and return the generated id.
 *
 * @param doc - Mutated in place: the created connector is pushed onto `doc.root`
 * @param params - Both endpoints, plus optional anchors, arrowheads, label and route; the
 *   anchor kinds decide the default routing, so a center endpoint yields a straight line
 * @param definitions - Type table whose `features.connectable` decides which endpoints are legal
 * @returns The id assigned to the new connector, `connector-N` unique across the root tree
 * @throws {@link DocOperationError} with a user-facing message when either endpoint is missing
 *   from the root tree or is not connectable
 */
export function connect(
	doc: CanvasDoc,
	params: ConnectParams,
	definitions: DocDefinitions,
): string {
	const sourceId = requireConnectable(doc, params.sourceId, definitions);
	const targetId = requireConnectable(doc, params.targetId, definitions);

	const id = generateUniqueId(doc, "connector");
	const source = buildEndpoint(sourceId, params.sourceAnchor);
	const target = buildEndpoint(targetId, params.targetAnchor);
	// A center endpoint defaults to straight; only two connectPoints leave routing omitted.
	const routing =
		params.routing ?? defaultRoutingForAnchors(source.anchor, target.anchor);
	const connector = {
		id,
		type: "connector",
		source,
		target,
		points: params.points !== undefined ? [...params.points] : [],
		...(routing !== undefined ? { routing } : {}),
		...(params.startArrow !== undefined
			? { startArrow: params.startArrow }
			: {}),
		...(params.endArrow !== undefined ? { endArrow: params.endArrow } : {}),
		...(params.label !== undefined && params.label !== ""
			? { label: { text: params.label } }
			: {}),
	};
	doc.root.push(connector as unknown as ObjectDoc);
	return id;
}
