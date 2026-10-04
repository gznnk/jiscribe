import { isTransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { collectObjectPartIds } from "../../../selection/collectObjectPartIds";
import { collectDescendantIds } from "../../../utils/collectDescendantIds";
import { ObjectPartOutline } from "../ObjectPartOutline";
import { Outline } from "../Outline";

type SelectionOverlayProps = {
	/**
	 * What the canvas is pointed at, `state.selection` as it stands: the reducer
	 * has already dropped a part that would draw a box around one no longer
	 * selected (reconcileObjectPartSelection). Only a kind declaring a `region` is
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
 * While parts of an object are selected, the outline of the object holding them turns
 * dashed: the solid boxes are the parts being operated on, the dashed one the selection
 * they sit inside. Every selected part is outlined, each from the box its own type
 * answers with (ObjectPartKindDefinition.region).
 */
const SelectionOverlayComponent: React.FC<SelectionOverlayProps> = ({
	selection,
	objects,
	multiSelectGroup,
}) => {
	const { objectPartKind } = useCanvasRegistries();

	const { objectIds: selectedIds, part: partSelection } = selection;
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

	// The type answers for its own parts, so both the object and its definition of
	// that kind have to be in hand before any of them can be outlined. The part is
	// only ever live on a sole selection, so that is its owner.
	const partOwner = partSelection ? objects[selectedIds[0]] : undefined;
	const part =
		partSelection && partOwner
			? objectPartKind.get(partOwner.type, partSelection.kind)
			: undefined;
	const outlinedPartIds =
		partSelection && partOwner && part?.region
			? collectObjectPartIds(partSelection, part, partOwner)
			: [];

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
						dashed={outlinedPartIds.length > 0 && partOwner?.id === id}
					/>
				);
			})}
			{/* For multiple selection, show bounding box outline of the virtual group */}
			{selectedIds.length > 1 &&
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) && (
					<Outline key="multi-select-group" frame={multiSelectGroup} />
				)}
			{partOwner &&
				part?.region &&
				outlinedPartIds.map((partId) => {
					const region = part.region?.(partOwner, partId) ?? null;
					return region === null ? null : (
						<ObjectPartOutline
							key={partId}
							object={partOwner}
							region={region}
						/>
					);
				})}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
