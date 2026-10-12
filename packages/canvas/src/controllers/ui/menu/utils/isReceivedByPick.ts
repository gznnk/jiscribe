import type { CoreStyleIntentKind } from "../../../style/StyleIntent";
import { TEXT_STYLE_INTENT_KINDS } from "../../../style/StyleIntent";

/**
 * What one builtin control of the ObjectMenu or the sidebar raises: `"text"` for
 * a control on the object's text, standing for every text kind
 * (TEXT_STYLE_INTENT_KINDS); otherwise the style intent kinds it reads and writes
 * (`useSelectionStyle`), empty for one that raises none (grouping, the frame
 * rows).
 */
export type BuiltinControlStyleIntentKinds =
	"text" | readonly CoreStyleIntentKind[];

/**
 * Whether a builtin control stays while a part is picked: every kind it raises
 * is one the picked kind receives. The one rule both surfaces narrow by
 * (filterMenuSectionsByPick, filterPropertyPanelSectionsByPick).
 *
 * @param controlKinds - What the control raises; an empty list is never kept
 * @param pickedIntentKinds - What the picked kind receives (readPickedStyleIntentKinds)
 */
export const isReceivedByPick = (
	controlKinds: BuiltinControlStyleIntentKinds,
	pickedIntentKinds: ReadonlySet<string>,
): boolean => {
	const raisedKinds =
		controlKinds === "text" ? [...TEXT_STYLE_INTENT_KINDS] : controlKinds;
	return (
		raisedKinds.length > 0 &&
		raisedKinds.every((kind) => pickedIntentKinds.has(kind))
	);
};
