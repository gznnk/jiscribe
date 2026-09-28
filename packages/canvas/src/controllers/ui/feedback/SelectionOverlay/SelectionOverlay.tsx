import { isTransformedFrame } from "@jiscribe/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { ObjectPartSelection } from "../../../selection/ObjectPartSelection";
import { collectDescendantIds } from "../../../utils/collectDescendantIds";
import { ObjectPartOutline } from "../ObjectPartOutline";
import { Outline } from "../Outline";

type SelectionOverlayProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	/**
	 * Part selection already validated by resolveObjectPartSelection; a raw
	 * state.objectPartSelection must not be passed, as a stale one would draw a box
	 * around a slot that is no longer selected
	 */
	objectPartSelection?: ObjectPartSelection | null;
};

/**
 * Renders selection outlines for all selected objects and their descendants.
 * For multiple selection, also renders an outline for the multiSelectGroup bounding box.
 * Groups now have cached bounding frames, so no calculation is needed.
 * While parts of an object are selected, the outline of the object holding them turns
 * dashed: the solid boxes are the parts being operated on, the dashed one the selection
 * they sit inside. Every selected part is outlined, each from the box its own type
 * answers with (ObjectPartDefinition.region).
 */
const SelectionOverlayComponent: React.FC<SelectionOverlayProps> = ({
	selectedIds,
	objects,
	multiSelectGroup,
	objectPartSelection = null,
}) => {
	const { objectPart } = useCanvasRegistries();

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
	// that kind have to be in hand before any of them can be outlined.
	const partOwner = objectPartSelection
		? objects[objectPartSelection.objectId]
		: undefined;
	const partRegion =
		objectPartSelection && partOwner
			? objectPart.get(partOwner.type, objectPartSelection.kind)?.region
			: undefined;

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
						dashed={objectPartSelection?.objectId === id}
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
				partRegion &&
				objectPartSelection?.partIds.map((partId) => {
					const region = partRegion(partOwner, partId);
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
