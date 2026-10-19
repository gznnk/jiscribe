import { applyStyleIntent } from "../../style/walk/applyStyleIntent";
import { readSelectionStyle } from "../../style/walk/readSelectionStyle";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Switches the selected shapes between placing their body in the region their
 * own outline leaves clear and placing it on their whole height. Offered exactly
 * where the switch moves a body at all, which is what a type's table answering
 * for the intent says (`features.textVerticalBasis`).
 *
 * A shape with a stated height keeps it and only moves its text. One whose
 * document leaves the height out has it derived again on the new basis by the
 * pass the reducer runs right after this one
 * (`reconcileObjectContentSizes` → `calcAutoShapeHeight`), which is what keeps a
 * body switched onto the whole height inside the region its type keeps clear of
 * its own decoration. Switching back to the region removes the field rather than
 * writing `"region"` into it, that being the reading of its absence
 * (textVerticalBasisEntry).
 */
export const ToggleTextVerticalBasisCommand: ExecutableCommand = {
	id: "toggleTextVerticalBasis",
	label: { en: "Text Vertical Basis", ja: "テキストを高さ全体に合わせる" },
	category: "arrange",

	canExecute: (state, registries) =>
		readSelectionStyle(state, "textVerticalBasis", registries).kind !== "none",

	execute: (state, registries) => {
		const current = readSelectionStyle(state, "textVerticalBasis", registries);
		if (current.kind === "none") {
			return state;
		}
		// A selection whose switchable shapes disagree reads as "not yet", so the
		// first press brings the whole selection to the frame basis and the second
		// takes it back — which is what makes two presses of one button land
		// somewhere predictable.
		const basis =
			current.kind === "single" && current.value === "frame"
				? "region"
				: "frame";
		return {
			...applyStyleIntent(
				state,
				{ kind: "textVerticalBasis", basis },
				registries,
			),
			commitVersion: state.commitVersion + 1,
		};
	},
};
