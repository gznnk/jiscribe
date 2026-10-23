import { resolveGroupingCommandId } from "./resolveGroupingCommandId";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether the ObjectMenu and the properties sidebar offer their group / ungroup
 * control for the selection; resolveGroupingCommandId picks which of the two.
 *
 * The command itself may still refuse — a selection of connectors alone, say —
 * and the control is then disabled rather than hidden. A picked part is not read
 * here: both surfaces drop the control while one narrows them
 * (readPickedPartStyleIntentKinds).
 *
 * @param state - Only `selection.objectIds` and the type of a sole selected object are read
 * @returns True while two or more objects, or a single group, are selected
 */
export const isGroupingOffered = (
	state: Pick<CanvasControllerState, "selection" | "objects">,
): boolean =>
	state.selection.objectIds.length > 1 ||
	resolveGroupingCommandId(state) === "ungroup";
