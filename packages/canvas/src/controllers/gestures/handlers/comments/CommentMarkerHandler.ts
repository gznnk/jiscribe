import {
	COMMENT_MARKER_TARGET_KIND,
	COMMENTS_SECTION_ID,
} from "./CommentMarkerTarget";
import { isConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createMultiSelectGroup } from "../../../utils/createMultiSelectGroup";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { determineSelection } from "../objects/utils/determineSelection";
import { commitTextEditUnlessTouchPress } from "../utils/commitTextEditUnlessTouchPress";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * Selects the object a comment marker sits on, the way a plain click on the
 * object itself would — the hierarchical rules included, so a marker on a
 * grouped shape selects whatever a click on that shape selects.
 */
const selectCommentTarget = (
	state: CanvasControllerState,
	objectId: string,
	event: CanvasEvent,
): CanvasControllerState => {
	const targetObject = state.objects[objectId];
	if (!targetObject) {
		return state;
	}

	if (isConnectorState(targetObject)) {
		return {
			...state,
			selectedConnectorId: objectId,
			selectedIds: [],
			selectedVertex: null,
			selectedTextSlot: null,
			multiSelectGroup: null,
		};
	}

	// determineSelection returning null means a plain click would leave the
	// selection alone, which happens when the object is already in it. The marker
	// still has to narrow a multi-selection down to this one object, since that is
	// the only selection the panel can name a target from (resolveMetaTargetId).
	const selectedIds = determineSelection(targetObject, state, event.mods) ?? [
		objectId,
	];
	return {
		...state,
		selectedIds,
		selectedConnectorId: null,
		selectedVertex: null,
		selectedTextSlot: null,
		multiSelectGroup:
			selectedIds.length > 1
				? createMultiSelectGroup(
						selectedIds,
						state.objects,
						state.multiSelectGroup,
					)
				: null,
	};
};

/**
 * GestureHandler for the comment markers drawn over objects that carry threads
 * (`data-kind="comment-marker"`, `data-id` naming the object).
 *
 * A click selects that object and opens the comment section, which is the one
 * entry point that works while the ObjectMenu holding the same panel is
 * withheld (`isObjectMenuSuppressed`). A press only closes the context menu:
 * the marker claims the event so the press can neither start a drag of the
 * object underneath nor reach the viewport and clear the selection.
 */
export const CommentMarkerHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			event.targetKind === COMMENT_MARKER_TARGET_KIND &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event) {
		// The marker is outside the text-editing overlay, so a pending edit is
		// committed like on any outside tap — deferred for a touch press.
		let nextState = commitTextEditUnlessTouchPress(state, event);

		if (event.type === "pressed") {
			return { ...nextState, contextMenuPosition: null };
		}

		// doubleClick pairs with click the way every menu target treats them: the
		// recognizer pairs two rapid presses without comparing targets, and a second
		// press on the marker means the same thing as the first.
		if (event.type !== "click" && event.type !== "doubleClick") {
			return nextState;
		}

		const objectId = event.targetId;
		if (!objectId) {
			return nextState;
		}

		nextState = selectCommentTarget(nextState, objectId, event);
		return {
			...nextState,
			objectMenuOpenId: COMMENTS_SECTION_ID,
			contextMenuPosition: null,
			stencilLibraryOpenCategory: null,
		};
	},
};
