import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import type { ObjectPartSelection } from "./ObjectPartSelection";
import { isTextSlotSelection, TEXT_SLOT_PART_KIND } from "./textSlotPartKind";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether the part selection still describes something real: its object is the
 * sole selection and alive, its kind is registered for that object's type, and
 * both ends of every range still name a part of it.
 */
const isPartSelectionLive = (
	target: ObjectState | undefined,
	part: ObjectPartSelection,
	objectPartKind: ObjectPartKindRegistry,
): boolean => {
	if (target === undefined) {
		return false;
	}
	const definition = objectPartKind.get(target.type, part.kind);
	if (definition === undefined) {
		return false;
	}
	return part.ranges.every(
		(range) =>
			definition.has(target, range.anchorId) &&
			definition.has(target, range.focusId),
	);
};

/**
 * Whether the object the session is open over can still hold it: present, and of
 * the shape the session's kind needs (text slots to write back into, or a
 * connector whose label it is).
 */
const isTextEditOwnerLive = (
	target: ObjectState | undefined,
	textEditState: NonNullable<CanvasControllerState["textEditState"]>,
): boolean => {
	if (target === undefined) {
		return false;
	}
	return textEditState.kind === "connectorLabel"
		? target.type === "connector"
		: isTextStyleState(target) && target.text !== undefined;
};

/**
 * Whether a shape session still names the slot it is written back to. A type that
 * spells its text out as slots says which one in `selection.part`, so a part of
 * another kind — or none — leaves the session with no slot of its own, and
 * `resolveTextEdit` would fall back to the type's first one. A type holding one
 * body registers no slot kind and names nothing below itself, that body being the
 * slot.
 */
const isTextEditSlotAddressed = (
	target: ObjectState | undefined,
	part: ObjectPartSelection | null,
	objectPartKind: ObjectPartKindRegistry,
): boolean => {
	if (target === undefined) {
		return false;
	}
	return (
		objectPartKind.get(target.type, TEXT_SLOT_PART_KIND) === undefined ||
		isTextSlotSelection(part)
	);
};

/**
 * Brings the selection and what hangs off it — the parts picked below the object,
 * and the open text edit — back in line with the state the action just produced.
 * The safety net every reducer branch that rewrites `selection` or `objects` runs
 * (the way `reconcileObjectContentSizes` is), and so the reason the readers may
 * take those invariants for granted instead of each validating them again:
 * `state.selection.part` is live wherever it is read, and `resolveTextEdit` can
 * throw on a session that does not pair with its selection rather than quietly
 * returning nothing.
 *
 * Two things are reconciled, both dropped whole rather than narrowed:
 * - the part selection, once its object is not the sole selection, is gone, does
 *   not declare the selection's `kind`, or no longer holds an end of one of its
 *   ranges (`has`)
 * - the open text edit, once no object can hold it: the selection is not one live
 *   object, a shape session's object holds no text slots, a label session's
 *   object is no connector, or — for a shape session over a type that spells its
 *   text out as slots — `selection.part` is no longer the live textSlot pick
 *   naming the slot it was being written to, whether it was dropped here or some
 *   writer left a part of another kind behind. Discarded, not committed: there is
 *   nowhere left to write the draft
 *
 * Catches what is gone, not what was renumbered: an operation that renumbers a
 * kind's ids rewrites or clears the selection itself (see ObjectPartSelection).
 *
 * @param state - The state just produced by an action, whose selection or open
 *   edit may name something the same action removed
 * @param objectPartKind - Per-canvas registry of part kinds, asked for the
 *   selection's own `kind` under the selected object's type; a type that declares
 *   no such kind has no parts to select, so the selection is dropped. Asked for
 *   the textSlot kind as well, to tell a type whose session needs a slot pick
 *   from one holding a single body
 * @returns `state` itself (same reference) when nothing has to change, which is
 *   what keeps memoized readers from re-rendering; otherwise a copy with the dead
 *   half nulled
 */
export const reconcileSelection = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState => {
	const { objectIds, part } = state.selection;
	const { textEditState } = state;
	if (part === null && !textEditState) {
		return state;
	}

	const target =
		objectIds.length === 1 ? state.objects[objectIds[0]] : undefined;
	const isPartLive =
		part === null || isPartSelectionLive(target, part, objectPartKind);
	// A shape session is written back to the slot the part names, so it goes with
	// that part; a connector label is no part of anything and outlives one.
	const isTextEditLive =
		!textEditState ||
		(isTextEditOwnerLive(target, textEditState) &&
			(textEditState.kind !== "shape" ||
				(isPartLive && isTextEditSlotAddressed(target, part, objectPartKind))));
	if (isPartLive && isTextEditLive) {
		return state;
	}

	return {
		...state,
		selection: isPartLive
			? state.selection
			: { ...state.selection, part: null },
		textEditState: isTextEditLive ? textEditState : null,
	};
};
