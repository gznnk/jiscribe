import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { Outline } from "../Outline";

type SelectionOverlayProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
};

/**
 * Renders selection outlines for all selected objects.
 * Groups now have cached bounding frames, so no calculation is needed.
 */
const SelectionOverlayComponent: React.FC<SelectionOverlayProps> = ({
	selectedIds,
	objects,
}) => {
	if (selectedIds.length === 0) {
		return null;
	}

	return (
		<g data-layer="selection-overlay">
			{selectedIds.map((id) => {
				const obj = objects[id];
				if (!obj) return null;

				// All objects with TransformedFrame (including groups with cached bounds)
				if (!isTransformedFrame(obj)) {
					return null;
				}

				return <Outline key={id} frame={obj} />;
			})}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
