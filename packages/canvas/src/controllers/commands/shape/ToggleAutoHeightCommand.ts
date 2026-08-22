import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ObjectAutoHeightRegistry } from "../../../states/registry/ObjectAutoHeightRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { getEffectiveSelectedIds } from "../../utils/getEffectiveSelectedIds";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * What the two helpers below read off the canvas: the selection and the objects
 * it names. Narrow enough for the menu item, which is handed those three and
 * nothing else (ObjectMenuItemProps).
 */
export type AutoHeightSelection = Pick<
	CanvasControllerState,
	"objects" | "selectedIds" | "selectedConnectorId"
>;

/**
 * The selected objects whose height may follow their text
 * (`ObjectAutoHeightRegistry`). A selection mixing them with other shapes
 * switches the ones that can and leaves the rest alone, the way the style menu
 * writes a property only to the objects declaring it.
 *
 * @param selection - The current selection and the objects it names
 * @param autoHeightRegistry - The canvas's per-type answer; a type absent from it is skipped
 * @returns The switchable ids, in selection order
 */
export const collectAutoHeightIds = (
	selection: AutoHeightSelection,
	autoHeightRegistry: ObjectAutoHeightRegistry,
): string[] =>
	getEffectiveSelectedIds(selection).filter((id) => {
		const object = selection.objects[id];
		return object !== undefined && autoHeightRegistry.supports(object.type);
	});

/**
 * Whether every switchable object in the selection already has its height
 * following the text. A mixed selection reads as "not yet", so the first press
 * brings the whole selection to auto and the second takes it back — which is
 * what makes two presses of one button land somewhere predictable.
 *
 * @param selection - The current selection and the objects it names
 * @param autoHeightRegistry - The canvas's per-type answer
 * @returns False when nothing in the selection can be switched at all
 */
export const isSelectionAutoHeight = (
	selection: AutoHeightSelection,
	autoHeightRegistry: ObjectAutoHeightRegistry,
): boolean => {
	const ids = collectAutoHeightIds(selection, autoHeightRegistry);
	return (
		ids.length > 0 &&
		ids.every((id) => selection.objects[id].autoHeight === true)
	);
};

/**
 * Switches the selected shapes between a height they state and one that follows
 * their text.
 *
 * Turning it on only sets the flag: the box is re-derived by the content-size
 * pass the reducer runs right after this one (`reconcileObjectContentSizes`), so
 * the height a shape ends up with is measured once, in the one place that
 * measures it. Turning it off keeps the box exactly as it is drawn and only
 * stops it from following the text — the height the shape is at is the height
 * the document then states.
 */
export const ToggleAutoHeightCommand: ExecutableCommand = {
	id: "toggleAutoHeight",
	label: "Auto Height",
	category: "arrange",

	canExecute: (state, registries) =>
		collectAutoHeightIds(state, registries.objectAutoHeight).length > 0,

	execute: (state, registries) => {
		const ids = collectAutoHeightIds(state, registries.objectAutoHeight);
		if (ids.length === 0) {
			return state;
		}
		const toAuto = !isSelectionAutoHeight(state, registries.objectAutoHeight);
		const objects = { ...state.objects };
		for (const id of ids) {
			const { autoHeight: _stated, ...fixed } = objects[id];
			objects[id] = (
				toAuto ? { ...fixed, autoHeight: true } : fixed
			) as ObjectState;
		}
		return { ...state, objects, commitVersion: state.commitVersion + 1 };
	},
};
