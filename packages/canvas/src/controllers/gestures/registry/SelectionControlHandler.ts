import { ControlStrategy } from "./ControlStrategy";
import type { CanvasEvent } from "./GestureHandlerTypes";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

/**
 * data-part namespace for selection controls. Keeps them out of the built-in
 * controls' flat namespace (resize: / rotation / vertex: …).
 */
const SELECTION_CONTROL_NAMESPACE = "selection";

/**
 * Extracts the object type from a selection-control data-part
 * (`selection:<objectType>:<partName>[:<sub>…]`), or null for any other part.
 * Gatekeeper for ControlEventHandler's registry fallback.
 */
export const parseSelectionControlObjectType = (
	targetPart: string,
): string | null => {
	const [namespace, objectType] = targetPart.split(":");
	return namespace === SELECTION_CONTROL_NAMESPACE && objectType
		? objectType
		: null;
};

/**
 * Base class for selection control handlers (per-type controls registered via
 * `ObjectTypeDefinition.selectionControls`). Owns the data-part format —
 * `selection:<objectType>:<partName>[:<sub>…]` — end to end: `part` is what
 * the control's Component must render, and the common supports() matches it
 * (exact, or prefixed for controls with sub-segments such as indexed handles).
 * Subclasses only implement handle().
 */
export abstract class SelectionControlHandler extends ControlStrategy {
	constructor(
		/** The object type this control belongs to (validated at registration). */
		readonly objectType: ObjectType,
		/** The control's name within the type (e.g. "headerHeight"). */
		readonly partName: string,
	) {
		super();
	}

	/** The full data-part value the control's handles carry. */
	get part(): string {
		return `${SELECTION_CONTROL_NAMESPACE}:${this.objectType}:${this.partName}`;
	}

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control" || !event.targetPart) {
			return false;
		}
		return (
			event.targetPart === this.part ||
			event.targetPart.startsWith(`${this.part}:`)
		);
	}
}
