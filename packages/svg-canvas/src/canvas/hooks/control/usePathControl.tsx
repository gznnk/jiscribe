import type { JSX } from "@emotion/react/jsx-runtime";

import { PathControl } from "../../../components/auxiliary/PathControl";
import type { PathState } from "../../../types/state/shapes/PathState";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasProps } from "../../types/SvgCanvasProps";
import { getDiagramByPath } from "../../utils/getDiagramByPath";

/**
 * Custom hook to render PathControl for selected Path items.
 * Only renders PathControl when a single Path is selected and not dragging.
 */
export const usePathControl = (props: SvgCanvasProps): JSX.Element | null => {
	const {
		interactionState,
		selectedDiagramPathIndex,
		items,
		zoom,
		onDiagramChange,
	} = props;

	// Get selected path item
	const paths = Array.from(selectedDiagramPathIndex.values());
	const selectedItem =
		paths.length === 1 ? getDiagramByPath(items, paths[0]) : null;

	// Don't render PathControl during dragging or when no path is selected
	if (interactionState === InteractionState.Dragging) {
		return null;
	}

	// If no selected item, return null
	if (!selectedItem) {
		return null;
	}

	// Ensure the selected item is a Path (not ConnectLine)
	if (selectedItem.type !== "Path") {
		return null;
	}

	// Cast to PathState since we've confirmed the type
	const pathItem = selectedItem as PathState;

	return (
		<PathControl
			key={`path-control-${pathItem.id}`}
			id={pathItem.id}
			rotation={pathItem.rotation}
			scaleX={pathItem.scaleX}
			scaleY={pathItem.scaleY}
			items={pathItem.items}
			pathType={pathItem.pathType}
			enableMidpointHandles={true}
			zoom={zoom}
			onDiagramChange={onDiagramChange}
		/>
	);
};
