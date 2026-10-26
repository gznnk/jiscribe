import { collectConnectorsAttachedToSelection } from "./collectConnectorsAttachedToSelection";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { getRootConnectorIds } from "../../utils/getRootConnectorIds";
import { sortObjectIdsByZOrder } from "../../utils/sortObjectIdsByZOrder";

/** The part of a canvas a selection carries with it when it is lifted out on its own. */
export type SelectionSubset = {
	/**
	 * Every object the subset holds: the selected ids, all their descendants, and
	 * the connectors whose attached ends are all on them (see
	 * collectConnectorsAttachedToSelection).
	 * The group holding a selected child is not in it unless it is selected itself.
	 */
	objectIds: ReadonlySet<string>;
	/**
	 * The subset's top-level elements, back to front: the selected ids and the
	 * attached connectors, sorted by their z-order on the canvas. A selected
	 * child of a group is top-level here.
	 */
	rootIds: string[];
};

/**
 * Collects what a selection lifts out of the canvas — the rule Copy puts on the
 * clipboard, and what an isolated export draws and embeds.
 *
 * @param selectedIds - The ids to lift out; each must be on the canvas, and none
 *   may be a descendant of another (a group and its own child would appear twice
 *   in `rootIds`)
 * @param objects - Flat object map of the whole canvas
 * @param rootIds - The canvas's root ids, which the attached connectors are
 *   looked for among and the z-order is read from
 */
export function collectSelectionSubset(
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
	rootIds: string[],
): SelectionSubset {
	const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
		selectedIds,
		objects,
	);
	const connectorIds = collectConnectorsAttachedToSelection(
		getRootConnectorIds(objects, rootIds),
		objects,
		selectedIdsWithDescendants,
	);
	return {
		objectIds: new Set([...selectedIdsWithDescendants, ...connectorIds]),
		rootIds: sortObjectIdsByZOrder(
			// A named connector is also found attached, and ids may repeat
			[...new Set([...selectedIds, ...connectorIds])],
			objects,
			rootIds,
		),
	};
}
