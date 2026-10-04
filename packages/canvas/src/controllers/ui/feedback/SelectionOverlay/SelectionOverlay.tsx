import { isTransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { collectSelectedPartIds } from "../../../selection/collectSelectedPartIds";
import { isTextSlotSelection } from "../../../selection/textSlotPartKind";
import { collectDescendantIds } from "../../../utils/collectDescendantIds";
import { Outline } from "../Outline";
import { TextSlotOutline } from "../TextSlotOutline";

type SelectionOverlayProps = {
	/**
	 * What the canvas is pointed at, `state.selection` as it stands: the reducer
	 * has already dropped a part that would draw a box around a slot no longer
	 * selected (reconcileObjectPartSelection). Only a pick of a text slot is
	 * outlined; a vertex has handles of its own (VertexControlsLayer)
	 */
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
};

/**
 * Renders selection outlines for all selected objects and their descendants.
 * For multiple selection, also renders an outline for the multiSelectGroup bounding box.
 * Groups now have cached bounding frames, so no calculation is needed.
 * While a text slot is selected, the outline of the object holding it turns dashed: the
 * solid box is the slot being operated on, the dashed one the selection it sits inside.
 */
const SelectionOverlayComponent: React.FC<SelectionOverlayProps> = ({
	selection,
	objects,
	multiSelectGroup,
}) => {
	const { objectIds: selectedIds } = selection;
	if (selectedIds.length === 0) {
		return null;
	}

	const slotSelection = isTextSlotSelection(selection.part)
		? selection.part
		: null;
	// The part is only ever live on a sole selection, so that is its owner.
	const slotObjectId = slotSelection === null ? null : selectedIds[0];

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

				return <Outline key={id} frame={obj} dashed={slotObjectId === id} />;
			})}
			{/* For multiple selection, show bounding box outline of the virtual group */}
			{selectedIds.length > 1 &&
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) && (
					<Outline key="multi-select-group" frame={multiSelectGroup} />
				)}
			{slotSelection && slotObjectId !== null && objects[slotObjectId] && (
				<TextSlotOutline
					object={objects[slotObjectId]}
					// One box, because in this version the selection is always a single
					// collapsed range (no Shift or Ctrl gesture builds a wider one yet).
					slotId={collectSelectedPartIds(slotSelection)[0]}
				/>
			)}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
