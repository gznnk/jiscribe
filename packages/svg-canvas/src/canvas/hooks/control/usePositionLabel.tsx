import type { JSX } from "@emotion/react/jsx-runtime";
import { isFrame } from "@workspace/geometry";

import { PositionLabel } from "../../../components/core/PositionLabel";
import { convertDiagramToFrame } from "../../../utils/core/convertDiagramToFrame";
import { MULTI_SELECT_GROUP } from "../../SvgCanvasConstants";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasProps } from "../../types/SvgCanvasProps";
import { getDiagramByPath } from "../../utils/getDiagramByPath";

/**
 * Custom hook to render PositionLabel for dragging items.
 * Shows position label for items during dragging:
 * - multiSelectGroup takes priority if it exists (multiple items selected)
 * - Otherwise, render for the single selected item that is being dragged
 */
export const usePositionLabel = (props: SvgCanvasProps): JSX.Element | null => {
	const {
		interactionState,
		multiSelectGroup,
		selectedDiagramPathIndex,
		items,
	} = props;

	// Only render PositionLabel during dragging
	if (interactionState !== InteractionState.Dragging) {
		return null;
	}

	// Multi-select case: render PositionLabel for the group
	if (multiSelectGroup && isFrame(multiSelectGroup)) {
		return (
			<PositionLabel
				key={`position-label-${MULTI_SELECT_GROUP}`}
				x={multiSelectGroup.x}
				y={multiSelectGroup.y}
				width={multiSelectGroup.width}
				height={multiSelectGroup.height}
				rotation={multiSelectGroup.rotation}
				scaleX={multiSelectGroup.scaleX}
				scaleY={multiSelectGroup.scaleY}
			/>
		);
	}

	// Single-select case: get the selected item using path index for efficient access
	const paths = Array.from(selectedDiagramPathIndex.values());
	if (paths.length === 1) {
		const selectedItem = getDiagramByPath(items, paths[0]);
		if (!selectedItem) {
			return null;
		}
		const selectedFrame = convertDiagramToFrame(selectedItem);
		if (selectedFrame) {
			return (
				<PositionLabel
					key={`position-label-${selectedItem.id}`}
					x={selectedFrame.cx}
					y={selectedFrame.cy}
					width={selectedFrame.width}
					height={selectedFrame.height}
					rotation={selectedFrame.rotation}
					scaleX={selectedFrame.scaleX}
					scaleY={selectedFrame.scaleY}
				/>
			);
		}
	}

	return null;
};
