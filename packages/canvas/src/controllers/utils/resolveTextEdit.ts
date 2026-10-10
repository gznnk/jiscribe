import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";

import type { ConnectorLabelPlacement } from "../../connectors/label/calcConnectorLabelPlacement";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import { getFirstTextSlotId } from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";
import { readActivePartFocusId } from "../selection/readActivePartFocusId";
import { isTextSlotSelection } from "../selection/textSlotPartKind";

/**
 * The open editing session paired with what it is editing: the draft off
 * `textEditState`, the owner off `selection`.
 */
export type ResolvedTextEdit =
	| {
			kind: "shape";
			/** The shape being edited, as it stands in the `objects` map that was read. */
			object: ObjectState & TextStyleState;
			/** The slot being edited; a key of `object.text`. */
			slotId: string;
			/** The draft body, styling included (see `textEditState`). */
			text: RichText;
			/** What the editor has selected, in UTF-16 offsets of `text`; absent until it has reported once. */
			selection?: { start: number; end: number };
	  }
	| {
			kind: "connectorLabel";
			/** The connector whose label is being edited. */
			connector: ConnectorState;
			/** The draft label text. */
			text: string;
			/** Placement a label being created takes on commit; absent for a re-edit. */
			placement?: ConnectorLabelPlacement;
	  };

/**
 * Resolves the open text-editing session against the selection that owns it. The
 * one read entry point for `textEditState`, so the draft and its owner are never
 * taken from two places.
 *
 * @param state - The controller state, read for the draft (`textEditState`), the
 *   owner (`selection`) and the object it names; `objects` may be the draft map
 *   the rendering side grafts, which holds the same ids and slots
 * @returns null when no session is open; otherwise the draft with its owner
 * @throws When the state breaks one of the invariants `textEditState` documents
 *   — the owner is not a lone selected object, a shape session's object holds no
 *   slot to edit, a label session's owner is no connector. Unreachable for a
 *   state the reducer has handed on, which closes such a session on the way out
 *   (`reconcileSelection`); returning null instead would make the editor vanish
 *   with nothing to trace it back to. A session over a type with slots whose
 *   `selection.part` no longer names one is closed there too, rather than being
 *   caught here: the fallback below cannot tell which slot was meant
 */
export const resolveTextEdit = (
	state: Pick<CanvasControllerState, "textEditState" | "selection" | "objects">,
): ResolvedTextEdit | null => {
	const { textEditState, selection, objects } = state;
	if (!textEditState) {
		return null;
	}

	const { objectIds, part } = selection;
	if (objectIds.length !== 1) {
		throw new Error(
			`Text edit (${textEditState.kind}) is open over ${objectIds.length} selected objects, which cannot own it`,
		);
	}
	const objectId = objectIds[0];
	const owner = objects[objectId];
	if (owner === undefined) {
		throw new Error(
			`Text edit (${textEditState.kind}) is open over a selected object that is gone: ${objectId}`,
		);
	}

	if (textEditState.kind === "connectorLabel") {
		if (owner.type !== "connector") {
			throw new Error(
				`Connector label edit is open over a "${owner.type}" object: ${objectId}`,
			);
		}
		return {
			kind: "connectorLabel",
			connector: owner as ConnectorState,
			text: textEditState.text,
			placement: textEditState.placement,
		};
	}

	if (!isTextStyleState(owner) || owner.text === undefined) {
		throw new Error(
			`Shape text edit is open over an object holding no text slots: ${objectId}`,
		);
	}
	// The fallback is for the types that pick nothing below themselves: one
	// holding a single body, which is the slot. A type spelling its text out as
	// slots always names the one being edited, the reducer closing a session that
	// stops doing so (reconcileSelection), so the fallback never stands in for a
	// slot it could only guess at.
	const slotId = isTextSlotSelection(part)
		? readActivePartFocusId(part)
		: getFirstTextSlotId(owner.text);
	// hasOwnProperty rather than a lookup, as the slot part kind checks it
	// (createTextSlotPartKindDefinition): "toString" names an Object.prototype
	// member on every slot map, and a slot is not that.
	if (
		slotId === undefined ||
		!Object.prototype.hasOwnProperty.call(owner.text, slotId)
	) {
		throw new Error(
			`Shape text edit is open on a slot ${objectId} does not hold: ${slotId}`,
		);
	}

	return {
		kind: "shape",
		object: owner,
		slotId,
		text: textEditState.text,
		selection: textEditState.selection,
	};
};
