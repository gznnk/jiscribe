import type { LayoutGraphEdge, LayoutVisualMargin } from "@jiscribe/layout";

import { readChildren } from "./objectAccess";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import {
	type RestackBeneathRequest,
	restackBeneath,
} from "../../model/objects/utils/restackBeneath";
import {
	type ConnectorUnderLabelText,
	listConnectorsUnderLabelText,
} from "../../text/label/calcLabelTextLayoutMargin";

/**
 * Where restacking takes the connectors the layout routed under a caption: each to
 * just beneath that shape, within its own parent, beneath the shape or the group
 * holding it there (restackBeneath), so the caption, knocking out what lies behind it,
 * reads over the line. Nothing is moved yet (see applyLabelTextRestack).
 */
type LabelTextRestack = {
	/** Each parent's children in their new order, for the parents whose order changes. */
	orderedIdsBySiblings: Map<ObjectDoc[], string[]>;
	/** The connectors moved, parent by parent, each parent's in the order they stood. */
	movedIds: string[];
};

/** Where restacking takes the connectors given, with the owners each runs under the caption of. */
const planLabelTextRestack = (
	doc: CanvasDoc,
	connectors: readonly ConnectorUnderLabelText[],
): LabelTextRestack => {
	const restack: LabelTextRestack = {
		orderedIdsBySiblings: new Map(),
		movedIds: [],
	};
	if (connectors.length === 0) {
		return restack;
	}
	const parentIdById = new Map<string, string>();
	const siblingsById = new Map<string, ObjectDoc[]>();
	const walk = (siblings: ObjectDoc[], parentId: string | undefined): void => {
		for (const object of siblings) {
			if (siblingsById.has(object.id)) {
				continue;
			}
			siblingsById.set(object.id, siblings);
			if (parentId !== undefined) {
				parentIdById.set(object.id, parentId);
			}
			walk(readChildren(object), object.id);
		}
	};
	walk(doc.root, undefined);
	const pathFrom = (id: string): string[] => {
		const path = [id];
		for (
			let parentId = parentIdById.get(id);
			parentId !== undefined;
			parentId = parentIdById.get(parentId)
		) {
			path.push(parentId);
		}
		return path;
	};
	const requestsBySiblings = new Map<ObjectDoc[], RestackBeneathRequest[]>();
	for (const { connectorId, ownerIds } of connectors) {
		const siblings = siblingsById.get(connectorId);
		if (siblings === undefined) {
			continue;
		}
		const request = { id: connectorId, beneathPaths: ownerIds.map(pathFrom) };
		const parentRequests = requestsBySiblings.get(siblings);
		if (parentRequests === undefined) {
			requestsBySiblings.set(siblings, [request]);
		} else {
			parentRequests.push(request);
		}
	}
	for (const [siblings, parentRequests] of requestsBySiblings) {
		const { orderedIds, movedIds } = restackBeneath(
			siblings.map(({ id }) => id),
			parentRequests,
		);
		if (movedIds.length > 0) {
			restack.orderedIdsBySiblings.set(siblings, orderedIds);
			restack.movedIds.push(...movedIds);
		}
	}
	return restack;
};

/** One parent's children in the order `restack` leaves them, as a new array. */
const readRestackedSiblings = (
	siblings: ObjectDoc[],
	restack: LabelTextRestack,
): ObjectDoc[] => {
	const orderedIds = restack.orderedIdsBySiblings.get(siblings);
	if (orderedIds === undefined) {
		return [...siblings];
	}
	const objectById = new Map(siblings.map((object) => [object.id, object]));
	return orderedIds.map((id) => objectById.get(id) as ObjectDoc);
};

/** Move the connectors where `restack` takes them, mutating the doc's parent arrays in place. */
const applyLabelTextRestack = (restack: LabelTextRestack): void => {
	for (const siblings of restack.orderedIdsBySiblings.keys()) {
		siblings.splice(
			0,
			siblings.length,
			...readRestackedSiblings(siblings, restack),
		);
	}
};

/**
 * Move each connector routed under its own end's caption to just beneath that shape in
 * the stacking order (see LabelTextRestack), mutating the doc's parent arrays in place.
 *
 * @param routedEdges - The edges as routed, with the side each end was put on
 * @param graphEdges - The edges the router was given, which name the owners of each one's ends
 * @param nodes - The shapes the ends sit on, each with the caption margin it was measured with; one without a margin hangs no caption over its bottom side
 * @param isRouteWritten - Whether the router's route was written for the connector; see listConnectorsUnderLabelText
 * @returns The connectors moved, parent by parent, each parent's in the order they stood
 */
export const restackConnectorsUnderLabelTexts = (
	doc: CanvasDoc,
	routedEdges: Parameters<typeof listConnectorsUnderLabelText>[0],
	graphEdges: readonly LayoutGraphEdge[],
	nodes: readonly { id: string; visualMargin?: LayoutVisualMargin }[],
	isRouteWritten: (connectorId: string) => boolean,
): string[] => {
	const marginById = new Map(
		nodes.flatMap(({ id, visualMargin }) =>
			visualMargin === undefined ? [] : [[id, visualMargin] as const],
		),
	);
	const restack = planLabelTextRestack(
		doc,
		listConnectorsUnderLabelText(
			routedEdges,
			graphEdges,
			marginById,
			isRouteWritten,
		),
	);
	applyLabelTextRestack(restack);
	return restack.movedIds;
};
