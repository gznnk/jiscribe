import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import { collectDescendantIds } from "./collectDescendantIds";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../states/objects/base/TextStyleState";
import { readTextSlot } from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether the object is of a `features.text: "label"` type and its caption holds
 * a character. A type declaring a text carries its slots in `text` (the mapper
 * and the state validator see to it), so the field is read without a guard.
 */
const holdsLabelText = (object: ObjectState | undefined): boolean =>
	object?.features?.text === "label" &&
	readTextSlot(
		(object as ObjectState & Pick<TextStyleState, "text">).text,
		BODY_TEXT_SLOT_ID,
	) !== "";

/**
 * Whether any `features.text: "label"` object the selection reaches — a
 * selected one, or one inside a selected group — carries caption text: the rows
 * stating its background (`labelFill`) draw nothing otherwise, there being no
 * painted box to color, and the sidebar's section heading goes with them.
 *
 * @param selection - The slice a section's `isShown` receives; an empty selection gives false
 */
export const hasSelectedLabelText = (
	selection: Pick<CanvasControllerState, "selection" | "objects">,
): boolean => {
	const { objects } = selection;
	return selection.selection.objectIds.some(
		(id) =>
			holdsLabelText(objects[id]) ||
			(objects[id]?.type === "group" &&
				collectDescendantIds(id, objects).some((descendantId) =>
					holdsLabelText(objects[descendantId]),
				)),
	);
};
