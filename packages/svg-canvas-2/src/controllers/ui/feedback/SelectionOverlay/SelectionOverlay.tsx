import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import { collectDescendantIds } from "../../utils/collectDescendantIds";
import { Outline } from "../Outline";

type SelectionOverlayProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
};

/**
 * Renders selection outlines for all selected objects and their descendants.
 * For multiple selection, also renders an outline for the multiSelectGroup bounding box.
 * Groups now have cached bounding frames, so no calculation is needed.
 */
const SelectionOverlayComponent: React.FC<SelectionOverlayProps> = ({
	selectedIds,
	objects,
	multiSelectGroup,
}) => {
	if (selectedIds.length === 0) {
		return null;
	}

	// Collect selected IDs plus all descendants (deduped)
	const allIds = [
		...selectedIds,
		...selectedIds.flatMap((id) => collectDescendantIds(id, objects)),
	];
	const uniqueIds = [...new Set(allIds)];

	return (
		<g data-layer="selection-overlay">
			{uniqueIds.map((id) => {
				const obj = objects[id];
				if (!obj) return null;

				if (!isTransformedFrame(obj)) {
					return null;
				}

				return <Outline key={id} frame={obj} />;
			})}
			{/* For multiple selection, show bounding box outline of the virtual group */}
			{selectedIds.length > 1 &&
				multiSelectGroup &&
				isTransformedFrame(multiSelectGroup) && (
					<Outline key="multi-select-group" frame={multiSelectGroup} />
				)}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
