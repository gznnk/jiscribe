import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import type { ObjectTextVerticalBasisRegistry } from "../../../states/registry/ObjectTextVerticalBasisRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { getEffectiveSelectedIds } from "../../utils/getEffectiveSelectedIds";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * A state seen with the one field this command reads and writes. The basis
 * belongs to a body-text type rather than to every object, so it is absent from
 * the shared `ObjectState`; the registry has already answered that these objects
 * carry one.
 */
type TextPlacedObjectState = ObjectState &
	Pick<TextStyleState, "textVerticalBasis">;

/**
 * What the two helpers below read off the canvas: the selection and the objects
 * it names. Narrow enough for the menu item, which is handed those three and
 * nothing else (ObjectMenuItemProps).
 */
export type TextVerticalBasisSelection = Pick<
	CanvasControllerState,
	"objects" | "selectedIds" | "selectedConnectorId"
>;

/**
 * The selected objects whose body actually moves with the basis
 * (`ObjectTextVerticalBasisRegistry`). A selection mixing them with other shapes
 * switches the ones that move and leaves the rest alone, the way the style menu
 * writes a property only to the objects declaring it.
 *
 * @param selection - The current selection and the objects it names
 * @param textVerticalBasisRegistry - The canvas's per-type answer; a type absent from it is skipped
 * @returns The switchable ids, in selection order
 */
export const collectTextVerticalBasisIds = (
	selection: TextVerticalBasisSelection,
	textVerticalBasisRegistry: ObjectTextVerticalBasisRegistry,
): string[] =>
	getEffectiveSelectedIds(selection).filter((id) => {
		const object = selection.objects[id];
		return (
			object !== undefined && textVerticalBasisRegistry.supports(object.type)
		);
	});

/**
 * Whether every switchable object in the selection is already placed against the
 * whole height. A mixed selection reads as "not yet", so the first press brings
 * the whole selection to the frame basis and the second takes it back — which is
 * what makes two presses of one button land somewhere predictable.
 *
 * @param selection - The current selection and the objects it names
 * @param textVerticalBasisRegistry - The canvas's per-type answer
 * @returns False when nothing in the selection can be switched at all
 */
export const isSelectionTextVerticalBasisFrame = (
	selection: TextVerticalBasisSelection,
	textVerticalBasisRegistry: ObjectTextVerticalBasisRegistry,
): boolean => {
	const ids = collectTextVerticalBasisIds(selection, textVerticalBasisRegistry);
	return (
		ids.length > 0 &&
		ids.every(
			(id) =>
				(selection.objects[id] as TextPlacedObjectState).textVerticalBasis ===
				"frame",
		)
	);
};

/**
 * Switches the selected shapes between placing their body in the region their
 * own outline leaves clear and placing it on their whole height.
 *
 * Only where the text is drawn changes: the box stays exactly as it is, a height
 * derived from the text included, since that derivation reads the declared
 * region whatever the basis says (`calcAutoShapeHeight`). Switching back to the
 * region removes the field rather than writing `"region"` into it, that being
 * the reading of its absence.
 */
export const ToggleTextVerticalBasisCommand: ExecutableCommand = {
	id: "toggleTextVerticalBasis",
	label: "Text Vertical Basis",
	category: "arrange",

	canExecute: (state, registries) =>
		collectTextVerticalBasisIds(state, registries.objectTextVerticalBasis)
			.length > 0,

	execute: (state, registries) => {
		const ids = collectTextVerticalBasisIds(
			state,
			registries.objectTextVerticalBasis,
		);
		if (ids.length === 0) {
			return state;
		}
		const toFrame = !isSelectionTextVerticalBasisFrame(
			state,
			registries.objectTextVerticalBasis,
		);
		const objects = { ...state.objects };
		for (const id of ids) {
			const { textVerticalBasis: _previousBasis, ...onRegion } = objects[
				id
			] as TextPlacedObjectState;
			const switched: TextPlacedObjectState = toFrame
				? { ...onRegion, textVerticalBasis: "frame" }
				: onRegion;
			objects[id] = switched;
		}
		return { ...state, objects, commitVersion: state.commitVersion + 1 };
	},
};
