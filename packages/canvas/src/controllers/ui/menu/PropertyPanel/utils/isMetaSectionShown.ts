import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ObjectPartKindRegistry } from "../../../../selection/partKinds/ObjectPartKindRegistry";
import { readPickedStyleIntentKinds } from "../../../../selection/readers/readPickedStyleIntentKinds";
import { resolveMetaTargetId } from "../../../../utils/resolveMetaTargetId";

/**
 * Whether the sidebar shows its Meta section — the note the selected object
 * carries in the document.
 *
 * The note belongs to one object, so the section stands only while the selection
 * names one (resolveMetaTargetId). A picked part that narrows the panel — a
 * text slot, an open shape editor's included — takes it away with everything
 * else: what is offered then is what the part receives
 * (getPropertyPanelSections), and the object's own note is not that.
 *
 * @param state - The selection channels and the picked part are read
 * @param objectPartKind - Per-canvas registry of part kinds, asked whether the picked kind narrows the panel (readPickedStyleIntentKinds)
 * @returns True while a single object, or a connector, is selected and no picked part narrows the panel
 */
export const isMetaSectionShown = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): boolean => {
	if (readPickedStyleIntentKinds(state, objectPartKind) !== null) {
		return false;
	}
	return resolveMetaTargetId(state) !== null;
};
