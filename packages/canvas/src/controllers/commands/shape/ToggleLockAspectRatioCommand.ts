import { applyStyleIntent } from "../../style/walk/applyStyleIntent";
import { getSelectedLockAspectRatio } from "../../style/walk/getSelectedLockAspectRatio";
import { readSelectionStyle } from "../../style/walk/readSelectionStyle";
import { commitEditIfChanged } from "../../utils/commitEdit";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Switches whether a resize keeps the selection's proportions.
 *
 * A command rather than a style write because the lock of a multi-selection is
 * not an object's at all: it belongs to the transient box drawn around the
 * selection (`createMultiSelectGroup`), which is session state no `StyleEntry`
 * can express. Which of the two is addressed is `getSelectedLockAspectRatio`'s
 * answer, the same one the row reporting the lock draws.
 */
export const ToggleLockAspectRatioCommand: ExecutableCommand = {
	id: "toggleLockAspectRatio",
	label: { en: "Lock Aspect Ratio", ja: "縦横比を固定" },
	category: "arrange",

	canExecute: (state, registries) =>
		state.multiSelectGroup !== null ||
		readSelectionStyle(state, "lockAspectRatio", registries).kind !== "none",

	execute: (state, registries) => {
		const { multiSelectGroup } = state;
		const locked = getSelectedLockAspectRatio(state, registries);
		if (multiSelectGroup !== null) {
			// Not committed: history and saves hold the document only, so an entry
			// here would record nothing an undo could take back.
			return {
				...state,
				multiSelectGroup: { ...multiSelectGroup, lockAspectRatio: !locked },
			};
		}
		const styled = applyStyleIntent(
			state,
			{ kind: "lockAspectRatio", locked: !locked },
			registries,
		);
		return commitEditIfChanged(state, styled);
	},
};
