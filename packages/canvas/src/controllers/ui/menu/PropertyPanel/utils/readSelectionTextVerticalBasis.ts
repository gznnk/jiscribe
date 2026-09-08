import type { TextVerticalBasis } from "@jiscribe/doc/model/objects/types/TextVerticalBasis";

import type { SelectionValue } from "./SelectionValue";
import type { ObjectTextVerticalBasisRegistry } from "../../../../../states/registry/ObjectTextVerticalBasisRegistry";
import type {
	TextPlacedObjectState,
	TextVerticalBasisSelection,
} from "../../../../utils/textVerticalBasisSelection";
import { collectTextVerticalBasisIds } from "../../../../utils/textVerticalBasisSelection";

/**
 * The basis the selection's switchable bodies are placed against, read only off
 * the objects the switch moves (ObjectTextVerticalBasisRegistry): a plain box in
 * the same selection has no say, since both bases put its text in one place. An
 * absent field reads as "region" (see TextVerticalBases).
 *
 * @param selection - The current selection and the objects it names
 * @param textVerticalBasisRegistry - The canvas's per-type answer
 * @returns "none" when nothing in the selection can be switched, "mixed" when the switchable objects disagree
 */
export const readSelectionTextVerticalBasis = (
	selection: TextVerticalBasisSelection,
	textVerticalBasisRegistry: ObjectTextVerticalBasisRegistry,
): SelectionValue<TextVerticalBasis> => {
	const ids = collectTextVerticalBasisIds(selection, textVerticalBasisRegistry);
	if (ids.length === 0) {
		return { kind: "none" };
	}
	const bases = new Set(
		ids.map(
			(id) =>
				(selection.objects[id] as TextPlacedObjectState).textVerticalBasis ??
				"region",
		),
	);
	return bases.size === 1
		? { kind: "single", value: [...bases][0] }
		: { kind: "mixed" };
};
