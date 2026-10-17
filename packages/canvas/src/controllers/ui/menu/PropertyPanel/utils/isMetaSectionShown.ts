import type { ObjectPartKindRegistry } from "../../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { readPickedPartStyleIntentKinds } from "../../../../selection/readers/readPickedPartStyleIntentKinds";
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
 * @param objectPartKind - Per-canvas registry of part kinds, asked whether the picked kind narrows the panel (readPickedPartStyleIntentKinds)
 * @returns True while a single object, or a connector, is selected and no picked part narrows the panel
 */
export const isMetaSectionShown = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): boolean => {
	if (readPickedPartStyleIntentKinds(state, objectPartKind) !== null) {
		return false;
	}
	return resolveMetaTargetId(state) !== null;
};
