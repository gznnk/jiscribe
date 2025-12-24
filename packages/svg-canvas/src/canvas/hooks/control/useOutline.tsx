import type { JSX } from "@emotion/react/jsx-runtime";
import { isFrame } from "@workspace/geometry";

import { Outline } from "../../../components/auxiliary/Outline";
import {
	collectOutlinedDiagrams,
	type OutlineData,
} from "../../../utils/core/collectOutlinedDiagrams";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import { MULTI_SELECT_GROUP } from "../../SvgCanvasConstants";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasProps } from "../../types/SvgCanvasProps";
import { getDiagramByPath } from "../../utils/getDiagramByPath";

/**
 * Custom hook to collect outlines to render based on interaction state.
 * Optimizes outline collection during interactions by only checking selected diagrams
 * instead of full tree traversal.
 * Returns rendered outline components as JSX elements.
 */
export const useOutline = (props: SvgCanvasProps): JSX.Element[] => {
	const {
		interactionState,
		selectedDiagramPathIndex,
		items,
		multiSelectGroup,
		zoom,
	} = props;

	// Optimize outline collection during interactions
	// During Dragging/Transforming/Changing, only check selected diagrams instead of full tree traversal
	const isInteracting =
		interactionState === InteractionState.Dragging ||
		interactionState === InteractionState.Transforming ||
		interactionState === InteractionState.Changing;

	let outlinesToRender: OutlineData[] = [];

	if (isInteracting) {
		// Fast path: only check selected diagrams
		const paths = Array.from(selectedDiagramPathIndex.values());
		if (paths.length === 1) {
			const diagram = getDiagramByPath(items, paths[0]);
			if (
				diagram &&
				isSelectableState(diagram) &&
				diagram.showOutline &&
				!diagram.outlineDisabled &&
				isFrame(diagram)
			) {
				outlinesToRender.push({
					id: diagram.id,
					x: diagram.x,
					y: diagram.y,
					width: diagram.width,
					height: diagram.height,
					rotation: diagram.rotation,
					scaleX: diagram.scaleX,
					scaleY: diagram.scaleY,
				});
			}
		}
	} else {
		// Normal path: full tree traversal
		outlinesToRender = collectOutlinedDiagrams(items);
	}

	// Add multiSelectGroup outline if it exists and has showOutline
	if (
		multiSelectGroup &&
		isSelectableState(multiSelectGroup) &&
		multiSelectGroup.showOutline &&
		isFrame(multiSelectGroup)
	) {
		outlinesToRender.push({
			id: MULTI_SELECT_GROUP,
			x: multiSelectGroup.x,
			y: multiSelectGroup.y,
			width: multiSelectGroup.width,
			height: multiSelectGroup.height,
			rotation: multiSelectGroup.rotation,
			scaleX: multiSelectGroup.scaleX,
			scaleY: multiSelectGroup.scaleY,
		});
	}

	// Render all outlines
	return outlinesToRender.map((outline) => (
		<Outline
			key={`outline-${outline.id}`}
			x={outline.x}
			y={outline.y}
			width={outline.width}
			height={outline.height}
			rotation={outline.rotation}
			scaleX={outline.scaleX}
			scaleY={outline.scaleY}
			showOutline={true}
			zoom={zoom}
		/>
	));
};
