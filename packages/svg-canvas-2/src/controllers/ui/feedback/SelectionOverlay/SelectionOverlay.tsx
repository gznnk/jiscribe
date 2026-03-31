import { isTransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { calculateGroupOrientedBounds } from "../../utils/calculateGroupOrientedBounds";
import { Outline } from "../Outline";

type SelectionOverlayProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
};

/**
 * Renders selection outlines for all selected objects.
 * For groups, displays a bounding box encompassing all child elements.
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

				// グループの場合はバウンディングボックスを計算
				if (obj.type === "group") {
					const bounds = calculateGroupOrientedBounds(objects, id);
					if (!bounds) return null;

					return <Outline key={id} frame={bounds} />;
				}

				// 通常のオブジェクト: TransformedFrameを持つ場合のみアウトライン表示
				if (!isTransformedFrame(obj)) {
					return null;
				}

				return <Outline key={id} frame={obj} />;
			})}
		</g>
	);
};

export const SelectionOverlay = memo(SelectionOverlayComponent);
