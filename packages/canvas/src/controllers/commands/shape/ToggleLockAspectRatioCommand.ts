import { DEFAULT_LOCK_ASPECT_RATIO } from "../../../states/objects/base/TransformState";
import { applyStyleIntent } from "../../style/applyStyleIntent";
import { readSelectionStyle } from "../../style/readSelectionStyle";
import { selectionValueOrFirst } from "../../style/SelectionValue";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Switches whether a resize keeps the selection's proportions.
 *
 * A command rather than a style write because the lock of a multi-selection is
 * not an object's at all: it belongs to the transient box drawn around the
 * selection (`createMultiSelectGroup`), which is session state no `StyleEntry`
 * can express. Choosing between that box and the selected objects is the one
 * thing this has to do, and it follows the precedence the row reporting the lock
 * follows (`getSelectedLockAspectRatio`).
 */
export const ToggleLockAspectRatioCommand: ExecutableCommand = {
	id: "toggleLockAspectRatio",
	label: { en: "Lock Aspect Ratio", ja: "縦横比を固定" },
	category: "arrange",

	canExecute: (state, registries) =>
		(state.multiSelectGroup !== null && state.selection.objectIds.length > 0) ||
		readSelectionStyle(state, "lockAspectRatio", registries).kind !== "none",

	execute: (state, registries) => {
		const { multiSelectGroup } = state;
		if (multiSelectGroup !== null && state.selection.objectIds.length > 0) {
			return {
				...state,
				multiSelectGroup: {
					...multiSelectGroup,
					lockAspectRatio: !(
						multiSelectGroup.lockAspectRatio ?? DEFAULT_LOCK_ASPECT_RATIO
					),
				},
				commitVersion: state.commitVersion + 1,
			};
		}
		// A selection whose objects disagree reads as the first of their values, so
		// one press brings the whole selection onto the other one — the same reading
		// the row shows.
		const locked = selectionValueOrFirst(
			readSelectionStyle(state, "lockAspectRatio", registries),
			DEFAULT_LOCK_ASPECT_RATIO,
		);
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
