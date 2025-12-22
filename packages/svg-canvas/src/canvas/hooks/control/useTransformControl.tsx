import type { JSX } from "@emotion/react/jsx-runtime";

import { TransformControl } from "../../../components/auxiliary/TransformControl";
import { isTransformativeState } from "../../../utils/validation/isTransformativeState";
import { MULTI_SELECT_GROUP } from "../../SvgCanvasConstants";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasProps } from "../../types/SvgCanvasProps";
import { getDiagramByPath } from "../../utils/getDiagramByPath";

/**
 * Custom hook to render TransformControl for selected items.
 * Only one TransformControl is rendered at a time:
 * - multiSelectGroup takes priority if it exists (multiple items selected)
 * - Otherwise, render for the single selected item that is transformable
 */
export const useTransformControl = (
	props: SvgCanvasProps,
): JSX.Element | null => {
	const {
		interactionState,
		multiSelectGroup,
		selectedDiagramPathIndex,
		items,
		zoom,
		onTransform,
	} = props;

	// Don't render TransformControl during dragging
	if (interactionState === InteractionState.Dragging) {
		return null;
	}

	// Multi-select case: render TransformControl for the group (always enabled)
	if (multiSelectGroup && isTransformativeState(multiSelectGroup)) {
		return (
			<TransformControl
				key={`transform-control-${MULTI_SELECT_GROUP}`}
				{...multiSelectGroup}
				id={MULTI_SELECT_GROUP}
				type="Group"
				zoom={zoom}
				onTransform={onTransform}
			/>
		);
	}

	// Single-select case: get the selected item using path index for efficient access
	const paths = Array.from(selectedDiagramPathIndex.values());
	if (paths.length === 1) {
		const selectedItem = getDiagramByPath(items, paths[0]);
		if (
			selectedItem &&
			isTransformativeState(selectedItem) &&
			!selectedItem.hideTransformControl &&
			selectedItem.transformEnabled !== false
		) {
			return (
				<TransformControl
					key={`transform-control-${selectedItem.id}`}
					{...selectedItem}
					zoom={zoom}
					onTransform={onTransform}
				/>
			);
		}
	}

	return null;
};
