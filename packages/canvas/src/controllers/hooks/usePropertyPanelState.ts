import { useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { collectDescendantIds } from "../utils/collectDescendantIds";
import { getEffectiveSelectedIds } from "../utils/getEffectiveSelectedIds";

/**
 * Everything the properties sidebar reads, as one flat list to compare entry by
 * entry. The selection fields come first; after them, the objects the selection
 * names — each selected object and, for a group, its descendants — which is the
 * only part of `objects` any row looks at (a row's frame, style, note and parent
 * are all fields of those objects).
 *
 * Kept in step with what PropertyPanel and its rows read: a field added to the
 * panel's reads and left out here goes stale on screen without a warning.
 */
const readPropertyPanelKey = (state: CanvasControllerState): unknown[] => {
	const selectedObjects = getEffectiveSelectedIds(state).flatMap((id) => [
		state.objects[id],
		...collectDescendantIds(id, state.objects).map(
			(descendantId) => state.objects[descendantId],
		),
	]);
	return [
		state.selectedIds,
		state.selectedConnectorId,
		state.selectedTextSlot,
		state.textEditState,
		state.multiSelectGroup,
		state.background,
		state.propertyPanel,
		...selectedObjects,
	];
};

const isSameKey = (previous: unknown[], next: unknown[]): boolean =>
	previous.length === next.length &&
	previous.every((entry, index) => Object.is(entry, next[index]));

/**
 * The state the properties sidebar is handed: the latest one whenever
 * something the sidebar shows has changed, otherwise the very object handed
 * out last time — so PropertyPanel's memo holds through a pan, a zoom, a
 * fling, or any other dispatch that touches nothing the sidebar reads, of
 * which there is one on nearly every pointer move.
 *
 * The sidebar therefore sees the rest of the state (the viewport, the
 * history, objects outside the selection) as of the last change it cared
 * about. Nothing it draws reads those, which is what makes the latch safe;
 * see `readPropertyPanelKey` for the reads it does make.
 *
 * @param state - The state the sidebar would otherwise be given: the draft-grafted one, so a keystroke mid-edit moves the selected object's reference and reaches the rows
 * @returns `state` itself on a change the sidebar shows; the previously returned state otherwise
 */
export const usePropertyPanelState = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const key = readPropertyPanelKey(state);
	// Latched during render rather than in an effect: the sidebar reads the
	// result in the same render, so the decision has to be made before it.
	const latchedRef = useRef({ key, state });
	if (!isSameKey(latchedRef.current.key, key)) {
		latchedRef.current = { key, state };
	}
	return latchedRef.current.state;
};
