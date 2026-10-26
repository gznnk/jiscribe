import type { ObjectPartKindRegistry } from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";

/**
 * The style intent kinds the part picked below the object receives, as its kind
 * declares them (`ObjectPartKindDefinition.styleIntentKinds`): what the ObjectMenu and
 * the properties sidebar narrow to while it is picked. An open shape text edit
 * keeps its slot picked (`CanvasMode`), so it narrows the same way.
 *
 * @param state - The selection and the objects it names; the pick belongs to `selection.objectIds[0]` whenever there is one (CanvasSelection.part)
 * @param objectPartKind - Per-canvas registry of part kinds, asked for the picked kind under the owner's type
 * @returns The declared kinds, or null when nothing is picked, the owner is not in `objects`, or the kind declares none (a vertex) — the object then stays the subject of every control
 */
export const readPickedPartStyleIntentKinds = (
	state: Pick<CanvasControllerState, "selection" | "objects">,
	objectPartKind: ObjectPartKindRegistry,
): ReadonlySet<string> | null => {
	const { part, objectIds } = state.selection;
	if (part === null) {
		return null;
	}
	const owner = state.objects[objectIds[0]];
	if (owner === undefined) {
		return null;
	}
	return objectPartKind.get(owner.type, part.kind)?.styleIntentKinds ?? null;
};
