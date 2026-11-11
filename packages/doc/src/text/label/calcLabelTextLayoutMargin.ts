import type { Dimensions } from "@jiscribe/geometry";
import type {
	LayoutEdgeAnchor,
	LayoutGraphEdge,
	LayoutSide,
	LayoutVisualMargin,
} from "@jiscribe/layout";

import { calcLabelTextVisualBounds } from "./calcLabelTextRegion";
import type {
	TextSlot,
	TextSlotStyle,
} from "../../model/objects/types/text/TextSlot";
import type { TextType } from "../../model/objects/types/text/TextType";

/**
 * How far a `features.text: "label"` type's caption reaches past each side of its
 * box, as the automatic layout keeps room for it (`LayoutGraphNode.visualMargin`):
 * the caption's drawn extent (calcLabelTextVisualBounds) less the box. The doc
 * layer's layout and the canvas's both ask here, so the two arrange a drawing alike.
 *
 * @param textType - The type's `features.text`; anything but `"label"` has no caption below its box
 * @param box - The box the layout places the shape by, in px
 * @param body - The caption's content and styling (see calcLabelTextBoxSize): a doc's root text fields or a state's body slot; undefined, or a text with no characters, draws no caption
 * @param typeDefaults - The type's defaults for its body slot (see calcLabelTextBoxSize)
 * @param isTransformed - True for a shape rotated or flipped, which the layout places by its untransformed box and keeps no room around
 * @returns The margin on each side, a side the caption does not reach past at 0; undefined when there is none at all
 */
export const calcLabelTextLayoutMargin = (
	textType: TextType | undefined,
	box: Dimensions,
	body: Partial<TextSlot> | undefined,
	typeDefaults: TextSlotStyle | undefined,
	isTransformed: boolean,
): LayoutVisualMargin | undefined => {
	if (textType !== "label" || isTransformed) {
		return undefined;
	}
	const extent = calcLabelTextVisualBounds(box, body, typeDefaults);
	const margin = {
		top: -box.height / 2 - extent.y,
		right: extent.x + extent.width - box.width / 2,
		bottom: extent.y + extent.height - box.height / 2,
		left: -box.width / 2 - extent.x,
	};
	return Object.values(margin).some((value) => value > 0) ? margin : undefined;
};

/**
 * Whether an edge end on `side` of a shape given `margin` by
 * {@link calcLabelTextLayoutMargin} runs under its caption: the bottom side, where
 * the caption hangs. A side the caption reaches past only by being wider than the
 * box is not one.
 */
const isEndUnderLabelText = (
	side: LayoutSide,
	margin: LayoutVisualMargin | undefined,
): boolean => side === "bottom" && (margin?.bottom ?? 0) > 0;

/** A connector the layout routed under the caption of one or both of its ends' owners. */
export type ConnectorUnderLabelText = {
	connectorId: string;
	/** The owners whose caption it runs under, the source's first. */
	ownerIds: string[];
};

/**
 * The connectors a layout routed under a caption: those with an end on the bottom of a
 * shape given a margin by {@link calcLabelTextLayoutMargin}, where its caption hangs. A
 * side the caption reaches past only by being wider than the box does not count.
 *
 * @param laidOutEdges - The edges as routed (a layered layout's, or routeConnectors'), each id a connector's, with the side each end was put on
 * @param graphEdges - The edges the layout was given, which name the owners of each one's ends
 * @param marginById - The margin each node was laid out with; a node absent has none
 * @param isRouteWritten - Whether the layout's route is written for the connector; one whose route is left to the engine (an end kept on a declared connect point) runs wherever the engine draws it, and is left out
 * @returns The connectors in the order of `laidOutEdges`
 */
export const listConnectorsUnderLabelText = (
	laidOutEdges: readonly {
		id: string;
		source: LayoutEdgeAnchor;
		target: LayoutEdgeAnchor;
	}[],
	graphEdges: readonly LayoutGraphEdge[],
	marginById: ReadonlyMap<string, LayoutVisualMargin>,
	isRouteWritten: (connectorId: string) => boolean,
): ConnectorUnderLabelText[] => {
	const graphEdgeById = new Map(graphEdges.map((edge) => [edge.id, edge]));
	return laidOutEdges.flatMap(({ id, source, target }) => {
		const graphEdge = graphEdgeById.get(id);
		if (graphEdge === undefined || !isRouteWritten(id)) {
			return [];
		}
		const ownerIds = [
			...(isEndUnderLabelText(source.side, marginById.get(graphEdge.sourceId))
				? [graphEdge.sourceId]
				: []),
			...(isEndUnderLabelText(target.side, marginById.get(graphEdge.targetId))
				? [graphEdge.targetId]
				: []),
		];
		return ownerIds.length === 0 ? [] : [{ connectorId: id, ownerIds }];
	});
};
