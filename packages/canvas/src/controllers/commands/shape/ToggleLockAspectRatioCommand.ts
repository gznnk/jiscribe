import { applyStyleIntent } from "../../style/applyStyleIntent";
import { getSelectedLockAspectRatio } from "../../style/getSelectedLockAspectRatio";
import { readSelectionStyle } from "../../style/readSelectionStyle";
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
			return {
				...state,
				multiSelectGroup: { ...multiSelectGroup, lockAspectRatio: !locked },
				commitVersion: state.commitVersion + 1,
			};
		}
		return {
			...applyStyleIntent(
				state,
				{ kind: "lockAspectRatio", locked: !locked },
				registries,
			),
			commitVersion: state.commitVersion + 1,
		};
	},
};
