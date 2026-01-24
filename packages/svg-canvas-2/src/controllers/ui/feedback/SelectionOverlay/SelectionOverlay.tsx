import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { Outline } from "../Outline";

type SelectionOverlayProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
};

/**
 * Renders selection outlines for all selected objects.
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
				return <Outline key={id} object={obj} />;
			})}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
