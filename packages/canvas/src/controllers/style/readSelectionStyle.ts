import { collectStyleTargets } from "./collectStyleTargets";
import type { StyleIntentRegistries } from "./ObjectStyleRegistry";
import {
	graftStyleTextEdit,
	resolveStyleTextEdit,
} from "./resolveStyleTextEdit";
import type { StyleIntentKind, StyleValueOf } from "./StyleIntent";
import type { CanvasControllerState } from "../CanvasTypes";
import type { SelectionValue } from "../ui/menu/utils/SelectionValue";
import { combineSelectionValues } from "../ui/menu/utils/SelectionValue";

/**
 * What a reading of one name answers in: the intent's own value type for a kind
 * of the engine's vocabulary, erased for a name a shape declared for itself
 * (extraStyleTable), whose entry works in the transport string and whose stored
 * type the engine does not know.
 */
type SelectionStyleValueOf<K extends string> = K extends StyleIntentKind
	? StyleValueOf<K>
	: unknown;

/**
 * What the whole selection says about one style intent: every place the intent
 * would land, read through its own type's entry and folded into one answer.
 *
 * The same walk `applyStyleIntent` writes along, so a row states the value of
 * exactly the objects a write would reach — the object an editor is open on
 * included, read with the draft grafted into the slot being edited
 * (resolveStyleTextEdit), which is what makes the rows follow the text on screen.
 * Values come out of `read` already resolved through the type's defaults, which is
 * why two shapes drawn alike read as one value whether or not they both spell it
 * out.
 *
 * @param state - The canvas state; its selection decides who is read
 * @param kind - The intent to report: one of the engine's own kinds, which fixes the value type, or a name a shape declared for itself, which cannot
 * @param registries - The canvas's style tables and the defaults its entries resolve through
 * @returns `single` / `mixed` / `none`, the last meaning nothing the selection reaches takes the intent
 */
export const readSelectionStyle = <K extends string>(
	state: CanvasControllerState,
	kind: K,
	registries: StyleIntentRegistries,
): SelectionValue<SelectionStyleValueOf<K>> => {
	const textEdit = resolveStyleTextEdit(state);
	const values: SelectionStyleValueOf<K>[] = [];

	for (const { object, pick, selected } of collectStyleTargets(state)) {
		const entry = registries.objectStyle.get(object.type)?.[kind];
		if (entry === undefined) {
			continue;
		}
		const target =
			textEdit !== null && textEdit.objectId === object.id
				? graftStyleTextEdit(object, textEdit)
				: object;
		values.push(
			...(entry.read(target, pick, {
				selected,
				shapeStyleDefaults: registries.objectShapeStyleDefaults,
				textStyleDefaults: registries.objectTextStyleDefaults,
				textEditRange: textEdit?.range ?? null,
			}) as readonly SelectionStyleValueOf<K>[]),
		);
	}

	return combineSelectionValues(values);
};
