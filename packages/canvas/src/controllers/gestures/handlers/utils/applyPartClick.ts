import { parsePartAddress } from "./partAddress";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ObjectPartKindRegistry } from "../../../selection/ObjectPartKindRegistry";

/**
 * Moves the part selection to where a click landed inside one object: the single
 * part the click's address names, or nothing at all when it names no live part
 * of that object — a click beside the parts steps the selection back up to the
 * object level. The one path from a part's DOM address to
 * `state.objectPartSelection`, shared by the object click (ObjectEventHandler)
 * and the vertex handles (VertexControlHandler), so neither spells a kind.
 *
 * @param state - Current canvas controller state, with this click's object
 *   selection already written (the part lives one level below it)
 * @param object - The object the click landed on, as the entry from
 *   `state.objects`
 * @param targetPart - The pressed element's [data-part] (`<kind>:<partId>`,
 *   parsePartAddress); untrusted DOM text, honored only once the kind is
 *   registered for the object's type and the id passes that kind's `has`
 * @param objectPartKind - The registry the kind and the id are checked against
 * @returns The state with the part written as one collapsed range, replacing
 *   whatever was picked, or with the part selection cleared. `state` itself
 *   whenever nothing has to change — re-clicking the picked part leaves an open
 *   submenu open
 */
export const applyPartClick = (
	state: CanvasControllerState,
	object: ObjectState,
	targetPart: string | undefined,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState => {
	const address = parsePartAddress(targetPart);
	const definition =
		address === null
			? undefined
			: objectPartKind.get(object.type, address.kind);

	if (
		address === null ||
		definition === undefined ||
		!definition.has(object, address.partId)
	) {
		if (state.objectPartSelection === null) {
			return state;
		}
		return {
			...state,
			objectPartSelection: null,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
		};
	}

	const current = state.objectPartSelection;
	if (
		current !== null &&
		current.objectId === object.id &&
		current.kind === address.kind &&
		current.ranges.length === 1 &&
		current.ranges[0].anchorId === address.partId &&
		current.ranges[0].focusId === address.partId
	) {
		return state;
	}

	// What the menu acts on moves with the part, so the open submenu closes just
	// as it does on an object selection change.
	return {
		...state,
		objectPartSelection: {
			objectId: object.id,
			kind: address.kind,
			ranges: [{ anchorId: address.partId, focusId: address.partId }],
		},
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
	};
};
