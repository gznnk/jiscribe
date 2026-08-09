import { isTransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { collectDescendantIds } from "../../../utils/collectDescendantIds";
import { Outline } from "../Outline";
import { TextSlotOutline } from "../TextSlotOutline";

type SelectionOverlayProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	/**
	 * Slot selection already validated by resolveSelectedTextSlot; a raw
	 * state.selectedTextSlot must not be passed, as a stale one would draw a box
	 * around a slot that is no longer selected
	 */
	selectedTextSlot?: CanvasControllerState["selectedTextSlot"];
};

/**
 * Renders selection outlines for all selected objects and their descendants.
 * For multiple selection, also renders an outline for the multiSelectGroup bounding box.
 * Groups now have cached bounding frames, so no calculation is needed.
 * While a text slot is selected, the outline of the object holding it turns dashed: the
 * solid box is the slot being operated on, the dashed one the selection it sits inside.
 */
const SelectionOverlayComponent: React.FC<SelectionOverlayProps> = ({
	selectedIds,
	objects,
	multiSelectGroup,
	selectedTextSlot = null,
}) => {
	if (selectedIds.length === 0) {
		return null;
	}

	// Collect selected IDs plus all descendants (deduped)
	const uniqueIds = new Set(selectedIds);
	for (const id of selectedIds) {
		for (const desc of collectDescendantIds(id, objects)) {
			uniqueIds.add(desc);
		}
	}

	return (
		<g data-layer="selection-overlay">
			{Array.from(uniqueIds).map((id) => {
				const obj = objects[id];
				if (!obj) {
					return null;
				}

				if (!isTransformedFrame(obj)) {
					return null;
				}

				return (
					<Outline
						key={id}
						frame={obj}
						dashed={selectedTextSlot?.objectId === id}
					/>
				);
			})}
			{/* For multiple selection, show bounding box outline of the virtual group */}
			{selectedIds.length > 1 &&
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) && (
					<Outline key="multi-select-group" frame={multiSelectGroup} />
				)}
			{selectedTextSlot && objects[selectedTextSlot.objectId] && (
				<TextSlotOutline
					object={objects[selectedTextSlot.objectId]}
					slotId={selectedTextSlot.slotId}
				/>
			)}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
