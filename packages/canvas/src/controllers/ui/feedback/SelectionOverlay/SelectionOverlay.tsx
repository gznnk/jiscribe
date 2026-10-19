import { isTransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { collectDescendantIds } from "../../../utils/collectDescendantIds";
import { collectOutlinedPartRegions } from "../../utils/collectOutlinedPartRegions";
import { ObjectPartOutline } from "../ObjectPartOutline";
import { Outline } from "../Outline";

type SelectionOverlayProps = {
	/**
	 * What the canvas is pointed at, `state.selection` as it stands: the reducer
	 * has already dropped a part that would draw a box around one no longer
	 * selected (reconcileSelection). A part with no box (collectOutlinedPartRegions)
	 * is not drawn here; a vertex has handles of its own (VertexControlsLayer)
	 */
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	/** Whether a text edit is open; a picked part's box is then outlined only, not tinted (ObjectPartOutline). */
	isTextEditing: boolean;
};

/**
 * Renders selection outlines for all selected objects and their descendants.
 * For multiple selection, also renders an outline for the multiSelectGroup bounding box.
 * Groups now have cached bounding frames, so no calculation is needed.
 * While parts of an object are selected, their boxes are drawn alone: the object's
 * outline just outside them would double a box that fills the object (a body slot).
 * Which parts get a box, and which box, is collectOutlinedPartRegions' answer; a
 * part with no box keeps the object outlines.
 */
const SelectionOverlayComponent: React.FC<SelectionOverlayProps> = ({
	selection,
	objects,
	multiSelectGroup,
	isTextEditing,
}) => {
	const { objectPartKind } = useCanvasRegistries();

	const { objectIds: selectedIds } = selection;
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

	const outlinedParts = collectOutlinedPartRegions(
		objects,
		objectPartKind,
		selection,
	);
	// The part is only ever live on a sole selection, so that is its owner.
	const partOwner = objects[selectedIds[0]];
	const drawsObjectOutlines = outlinedParts.length === 0;

	return (
		<g data-layer="selection-overlay">
			{drawsObjectOutlines &&
				Array.from(uniqueIds).map((id) => {
					const obj = objects[id];
					if (!obj) {
						return null;
					}

					if (!isTransformedFrame(obj)) {
						return null;
					}

					return <Outline key={id} frame={obj} />;
				})}
			{/* For multiple selection, show bounding box outline of the virtual group */}
			{drawsObjectOutlines &&
				selectedIds.length > 1 &&
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) && (
					<Outline key="multi-select-group" frame={multiSelectGroup} />
				)}
			{partOwner &&
				outlinedParts.map(({ partId, region }) => (
					<ObjectPartOutline
						key={partId}
						object={partOwner}
						region={region}
						filled={!isTextEditing}
					/>
				))}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
