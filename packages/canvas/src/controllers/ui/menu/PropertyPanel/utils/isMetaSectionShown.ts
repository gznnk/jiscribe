import type { CanvasControllerState } from "../../../../CanvasTypes";
import { resolveMetaTargetId } from "../../../../utils/resolveMetaTargetId";
import { resolveSelectedTextSlot } from "../../../../utils/resolveSelectedTextSlot";

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
 * @param state - The selection channels, the selected text slot and the open text edit are read
 * @returns True while a single object, or a connector, is selected and no text is being addressed
 */
export const isMetaSectionShown = (state: CanvasControllerState): boolean => {
	if (
		resolveSelectedTextSlot(state) !== null ||
		state.textEditState?.kind === "shape"
	) {
		return false;
	}
	return resolveMetaTargetId(state) !== null;
};
