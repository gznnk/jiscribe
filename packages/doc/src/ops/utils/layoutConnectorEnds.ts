import type { Rect } from "@jiscribe/geometry";
import { EDGE_END_SPACING } from "@jiscribe/layout";

import type { EdgeAnchorHandle } from "./connectorEndpoints";
import type { ConnectorDoc } from "../../model/objects/connector/ConnectorDoc";
import {
	type EndpointRef,
	isConnectPointId,
	toEquivalentEdgeAnchor,
} from "../../model/objects/types/EndpointRef";

export const readOwnerId = (endpoint: EndpointRef): string | undefined =>
	endpoint.owner?.id;

/**
 * Whether an end sits on a connect point the owner's type declares beyond the four
 * edge midpoints (an ER entity's column), which says where on the owner the line
 * belongs and so is kept as the author set it.
 */
export const keepsOwnAnchor = (endpoint: EndpointRef): boolean =>
	endpoint.anchor.kind === "connectPoint" &&
	!isConnectPointId(endpoint.anchor.id);

const centreOf = (bounds: Rect): { x: number; y: number } => ({
	x: bounds.x + bounds.width / 2,
	y: bounds.y + bounds.height / 2,
});

/** The midpoints of the sides of two boxes that face each other, by the larger offset between their centres. */
export const calcFacingEdgeAnchors = (
	source: Rect,
	target: Rect,
): { source: EdgeAnchorHandle; target: EdgeAnchorHandle } => {
	const deltaX = centreOf(target).x - centreOf(source).x;
	const deltaY = centreOf(target).y - centreOf(source).y;
	if (Math.abs(deltaX) >= Math.abs(deltaY)) {
		return deltaX >= 0
			? { source: { side: "right", t: 0.5 }, target: { side: "left", t: 0.5 } }
			: { source: { side: "left", t: 0.5 }, target: { side: "right", t: 0.5 } };
	}
	return deltaY >= 0
		? { source: { side: "bottom", t: 0.5 }, target: { side: "top", t: 0.5 } }
		: { source: { side: "top", t: 0.5 }, target: { side: "bottom", t: 0.5 } };
};

/** Hands out free positions on the sides of objects; see {@link createTakenEnds}. */
export type TakenEnds = {
	/**
	 * The position on `side` of the owner nearest the side's midpoint that keeps
	 * {@link EDGE_END_SPACING} from every end already there, within a tenth of the side
	 * at either end, or the midpoint itself when nothing fits; taken from then on.
	 *
	 * @param box - The owner's box, for the side's length
	 */
	place: (
		ownerId: string,
		side: EdgeAnchorHandle["side"],
		box: Rect,
	) => EdgeAnchorHandle;
};

/**
 * Where ends already sit on each side of each object, so a line added after the
 * layout can land clear of them: read off the endpoints of `connectors`, and told of
 * each end placed since.
 */
export const createTakenEnds = (
	connectors: readonly ConnectorDoc[],
): TakenEnds => {
	const positionsBySide = new Map<string, number[]>();
	const keyOf = (ownerId: string, side: EdgeAnchorHandle["side"]): string =>
		`${ownerId}:${side}`;
	const take = (
		ownerId: string,
		side: EdgeAnchorHandle["side"],
		t: number,
	): void => {
		const key = keyOf(ownerId, side);
		const positions = positionsBySide.get(key);
		if (positions === undefined) {
			positionsBySide.set(key, [t]);
		} else {
			positions.push(t);
		}
	};
	const note = (endpoint: EndpointRef): void => {
		const ownerId = readOwnerId(endpoint);
		const edgeAnchor = toEquivalentEdgeAnchor(endpoint.anchor);
		if (ownerId !== undefined && edgeAnchor !== null) {
			take(ownerId, edgeAnchor.side, edgeAnchor.t);
		}
	};
	for (const connector of connectors) {
		note(connector.source);
		note(connector.target);
	}
	return {
		place: (ownerId, side, box) => {
			const extent =
				side === "top" || side === "bottom" ? box.width : box.height;
			const taken = positionsBySide.get(keyOf(ownerId, side)) ?? [];
			const gap = extent > 0 ? EDGE_END_SPACING / extent : 0;
			const isFree = (t: number): boolean =>
				taken.every((position) => Math.abs(position - t) >= gap);
			let t = 0.5;
			if (!isFree(0.5)) {
				for (let step = gap; 0.5 + step <= 0.9; step += gap) {
					if (isFree(0.5 - step)) {
						t = 0.5 - step;
						break;
					}
					if (isFree(0.5 + step)) {
						t = 0.5 + step;
						break;
					}
				}
			}
			take(ownerId, side, t);
			return { side, t };
		},
	};
};
