import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";
import type { ObjectPartSelection } from "../selection/CanvasSelection";
import { collectDescendantIds } from "../utils/collectDescendantIds";

/** One object a style intent reaches, and how it is addressed. */
export type StyleTarget = {
	/** The object as the walk found it; a writer re-reads it from the map it is building. */
	object: ObjectState;
	/**
	 * What is picked inside this object, null when the whole object is addressed.
	 * Only the sole selected object can carry one (CanvasSelection.part), so a
	 * descendant and any member of a multi-selection are always addressed whole.
	 */
	pick: ObjectPartSelection | null;
	/** Whether the object is selected itself rather than reached through a selected group. */
	selected: boolean;
};

/**
 * Every object a style intent reaches, in selection order: each selected object
 * followed by the descendants it contributes when it is a group
 * (`collectDescendantIds`). A selected connector is one target among the rest.
 *
 * The single reading of the selection the style layer has — both walkers take
 * this walk, so writing a style and reporting it can no longer disagree about
 * who was addressed.
 *
 * @param state - The canvas state; only its selection and objects are read, and a selected id the objects no longer hold is skipped
 * @returns The targets; no object appears twice unless the selection names both a group and a member of it, the map being a tree
 */
export const collectStyleTargets = (
	state: CanvasControllerState,
): StyleTarget[] => {
	const { selection, objects } = state;
	const { objectIds, part } = selection;
	const targets: StyleTarget[] = [];

	for (const id of objectIds) {
		const selectedObject = objects[id];
		if (selectedObject === undefined) {
			continue;
		}
		targets.push({
			object: selectedObject,
			// The part belongs to the sole selected object, so it is handed over
			// only where the selection is that one object (the rule
			// reconcileSelection keeps, restated rather than trusted).
			pick: objectIds.length === 1 ? part : null,
			selected: true,
		});
		for (const descendantId of collectDescendantIds(id, objects)) {
			const descendant = objects[descendantId];
			if (descendant !== undefined) {
				targets.push({ object: descendant, pick: null, selected: false });
			}
		}
	}

	return targets;
};
