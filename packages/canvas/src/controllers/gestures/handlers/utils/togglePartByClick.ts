import { parsePartAddress } from "./partAddress";
import type { ObjectPartKindRegistry } from "../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ObjectPartRange } from "../../../selection/CanvasSelection";
import { collectObjectPartIds } from "../../../selection/readers/collectObjectPartIds";

/** A range naming the one part. */
const singlePartRange = (partId: string): ObjectPartRange => ({
	anchorId: partId,
	focusId: partId,
});

/**
 * Adds the part a Ctrl / Meta-click landed on to the pick, or takes it out. A part
 * no range covers is appended as a range of its own, which becomes the active
 * one. A covered part is taken out of every range covering it: a range of that
 * part alone is dropped, and a longer one is broken into one range per part it
 * still covers, the kind saying what it covers (collectObjectPartIds), so the
 * rest stays picked whatever shape the range had. Taking out the last part
 * clears the pick and leaves the object selected.
 *
 * Only a part of the kind already picked, on the object that is the whole
 * selection, of a kind declaring `multiPick`, toggles; anything else is no
 * toggle and is left to the object-level path.
 *
 * Not committed: a selection change is no edit of the document.
 *
 * @param state - Current canvas controller state
 * @param object - The object the click landed on, as the entry from
 *   `state.objects`
 * @param targetPart - The pressed element's [data-part]; untrusted DOM text,
 *   honored only once its kind is the picked one and its id passes that kind's
 *   `has`
 * @param objectPartKind - The registry the kind, its `multiPick` and the id are
 *   checked against
 * @returns The state with the part toggled and any open submenu closed, or null
 *   when the click is no toggle
 */
export const togglePartByClick = (
	state: CanvasControllerState,
	object: ObjectState,
	targetPart: string | undefined,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState | null => {
	const { objectIds, part } = state.selection;
	const address = parsePartAddress(targetPart);
	if (
		part === null ||
		objectIds.length !== 1 ||
		objectIds[0] !== object.id ||
		address === null ||
		address.kind !== part.kind
	) {
		return null;
	}
	const definition = objectPartKind.get(object.type, address.kind);
	if (
		definition === undefined ||
		definition.multiPick !== true ||
		!definition.has(object, address.partId)
	) {
		return null;
	}

	let isCovered = false;
	const remainingRanges = part.ranges.flatMap((range) => {
		const coveredPartIds = collectObjectPartIds(
			{ kind: part.kind, ranges: [range] },
			definition,
			object,
		);
		if (!coveredPartIds.includes(address.partId)) {
			return [range];
		}
		isCovered = true;
		return coveredPartIds
			.filter((partId) => partId !== address.partId)
			.map(singlePartRange);
	});
	const nextRanges = isCovered
		? remainingRanges
		: [...part.ranges, singlePartRange(address.partId)];

	// What the menu acts on changes with the pick, so the open submenu closes just
	// as it does on a plain part click (selectPartByClick).
	return {
		...state,
		selection: {
			...state.selection,
			part:
				nextRanges.length === 0
					? null
					: { kind: part.kind, ranges: nextRanges },
		},
		objectMenuOpenId: null,
		stencilFlyout: null,
	};
};
