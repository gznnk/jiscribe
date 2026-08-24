import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextState } from "../../../states/objects/primitives/text/TextState";
import { isTextState } from "../../../states/objects/primitives/text/TextState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { getEffectiveSelectedIds } from "../../utils/getEffectiveSelectedIds";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * What the two helpers below read off the canvas: the selection and the objects
 * it names. Narrow enough for the menu item, which is handed those three and
 * nothing else (ObjectMenuItemProps).
 */
export type TextLayoutSelection = Pick<
	CanvasControllerState,
	"objects" | "selectedIds" | "selectedConnectorId"
>;

/**
 * The selected objects that carry a text layout at all, which is the `text`
 * shape alone: it is the only type whose box is measured from its own text in
 * both directions, and therefore the only one that can be told to keep a width
 * instead. A selection mixing it with other shapes switches the texts and leaves
 * the rest alone, the way the style menu writes a property only to the objects
 * declaring it.
 *
 * @param selection - The current selection and the objects it names
 * @returns The switchable ids, in selection order
 */
export const collectTextLayoutIds = (
	selection: TextLayoutSelection,
): string[] =>
	getEffectiveSelectedIds(selection).filter((id) =>
		isTextState(selection.objects[id]),
	);

/**
 * Whether every text in the selection already wraps in a width of its own. A
 * mixed selection reads as "not yet", so the first press brings the whole
 * selection to the block layout and the second takes it back — which is what
 * makes two presses of one button land somewhere predictable.
 *
 * @param selection - The current selection and the objects it names
 * @returns False when the selection holds no text at all
 */
export const isSelectionTextBlock = (
	selection: TextLayoutSelection,
): boolean => {
	const ids = collectTextLayoutIds(selection);
	return (
		ids.length > 0 &&
		ids.every(
			(id) => (selection.objects[id] as TextState).textLayout === "block",
		)
	);
};

/**
 * Switches the selected texts between a width measured from the text and one the
 * text wraps in.
 *
 * Turning it on writes no width: the state's `width` is already the box the text
 * was measured into, and keeping it is what makes the switch invisible — the
 * same box, now stated rather than derived, and stored by the mapper from that
 * moment on. Turning it off only drops the layout; the box shrinks back to the
 * longest line in the content-size pass the reducer runs right after this one
 * (`reconcileObjectContentSizes`), so the text is measured once, in the one place
 * that measures it.
 */
export const ToggleTextLayoutCommand: ExecutableCommand = {
	id: "toggleTextLayout",
	label: "Wrap Text in Fixed Width",
	category: "arrange",

	canExecute: (state) => collectTextLayoutIds(state).length > 0,

	execute: (state) => {
		const ids = collectTextLayoutIds(state);
		if (ids.length === 0) {
			return state;
		}
		const toBlock = !isSelectionTextBlock(state);
		const objects = { ...state.objects };
		for (const id of ids) {
			const { textLayout: _measured, ...label } = objects[id] as TextState;
			objects[id] = (
				toBlock ? { ...label, textLayout: "block" } : label
			) as ObjectState;
		}
		return { ...state, objects, commitVersion: state.commitVersion + 1 };
	},
};
