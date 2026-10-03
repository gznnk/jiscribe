import type { CanvasControllerState } from "../../../../CanvasTypes";
import { isTextSlotAddressed } from "../../../../selection/isTextSlotAddressed";
import type { ObjectPartKindRegistry } from "../../../../selection/ObjectPartKindRegistry";
import { resolveMetaTargetId } from "../../../../utils/resolveMetaTargetId";

/**
 * Whether the sidebar shows its Meta section — the note the selected object
 * carries in the document.
 *
 * The note belongs to one object, so the section stands only while the selection
 * names one (resolveMetaTargetId). A selected text slot and an open shape editor
 * take it away with everything else: what is offered then is narrowed to the
 * text of the stretch being edited (getPropertyPanelSections), and the object's
 * own note is not that.
 *
 * @param state - The selection channels, the picked part and the open text edit are read
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, read for whether the pick below the object stands for text slots
 * @returns True while a single object, or a connector, is selected and no text is being addressed
 */
export const isMetaSectionShown = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): boolean => {
	if (
		isTextSlotAddressed(state, objectPartKind) ||
		state.textEditState?.kind === "shape"
	) {
		return false;
	}
	return resolveMetaTargetId(state) !== null;
};
