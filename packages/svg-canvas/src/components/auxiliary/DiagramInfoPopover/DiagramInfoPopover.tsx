import React, { memo, useRef, useEffect, useState } from "react";

import {
	PopoverContainer,
	PopoverContent,
	PopoverLabel,
	PopoverFieldContainer,
	PopoverText,
} from "./DiagramInfoPopoverStyled";
import type { DiagramInfoPopoverProps } from "./iagramInfoPopoverTypes";
import type { SvgCanvasProps } from "../../../canvas/types/SvgCanvasProps";
import {
	DISTANCE_FROM_DIAGRAM,
	MIN_POPOVER_HEIGHT,
	MIN_POPOVER_WIDTH,
} from "../../../constants/styling/auxiliary/DiagramInfoPopoverStyling";
import type { Diagram } from "../../../types/state/core/Diagram";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { calcDiagramBoundingBox } from "../../../utils/math/geometry/calcDiagramBoundingBox";
import { isFrame } from "../../../utils/validation/isFrame";

const DiagramInfoPopoverComponent = ({
	canvasProps,
	containerWidth,
	containerHeight,
}: DiagramInfoPopoverProps): React.JSX.Element => {
	const popoverRef = useRef<HTMLDivElement>(null);
	const [previousSelectedDiagramId, setPreviousSelectedDiagramId] =
		useState<string>("");
	const [popoverDimensions, setPopoverDimensions] = useState({
		width: MIN_POPOVER_WIDTH,
		height: MIN_POPOVER_HEIGHT,
	});

	// Get selected diagrams
	const selectedDiagrams = getSelectedDiagrams(canvasProps.items);
	const selectedDiagram = selectedDiagrams[0];
	// Get selected diagram ID for dependency tracking
	const selectedDiagramId = selectedDiagram?.id || "";

	const isVisible =
		selectedDiagrams.length > 0 &&
		canvasProps.interactionState === "idle" &&
		selectedDiagram &&
		(selectedDiagram.name || selectedDiagram.description);

	// Update popover dimensions when DOM changes or selected diagram changes
	useEffect(() => {
		if (popoverRef.current && isVisible) {
			const rect = popoverRef.current.getBoundingClientRect();
			setPopoverDimensions({ width: rect.width, height: rect.height });
		}
		// Update the state for tracking
		setPreviousSelectedDiagramId(selectedDiagramId);
	}, [isVisible, selectedDiagramId]);

	if (!isVisible) {
		return <></>;
	}

	// Calculate position for popover display
	const position = calculatePopoverPosition(
		canvasProps,
		containerWidth,
		containerHeight,
		selectedDiagram,
		popoverDimensions,
	);

	// Check if selected diagram has changed to control z-index
	const isDiagramChanged = previousSelectedDiagramId !== selectedDiagramId;

	return (
		<PopoverContainer
			ref={popoverRef}
			style={{
				left: position.x,
				top: position.y,
			}}
			zIndex={isDiagramChanged ? -1 : 1050}
		>
			<PopoverContent>
				<PopoverFieldContainer>
					<PopoverLabel>Name</PopoverLabel>
					<PopoverText>{selectedDiagram.name || "Untitled"}</PopoverText>
				</PopoverFieldContainer>

				<PopoverFieldContainer>
					<PopoverLabel>Description</PopoverLabel>
					<PopoverText>
						{selectedDiagram.description || "No description"}
					</PopoverText>
				</PopoverFieldContainer>
			</PopoverContent>
		</PopoverContainer>
	);
};

/**
 * Calculate the position for popover display
 * Priority: right side of the shape, fallback to left side if no space
 * Note: This now works in the HTMLElementsContainer coordinate system without zoom
 */
const calculatePopoverPosition = (
	canvasProps: SvgCanvasProps,
	containerWidth: number,
	containerHeight: number,
	diagram?: Diagram,
	popoverDimensions?: { width: number; height: number },
): { x: number; y: number } => {
	if (!diagram) {
		return { x: 0, y: 0 }; // Default position if no diagram
	}
	if (!isFrame(diagram)) {
		return { x: diagram.x, y: diagram.y };
	}

	const boundingBox = calcDiagramBoundingBox(diagram);
	const popoverWidth = popoverDimensions?.width || MIN_POPOVER_WIDTH;
	const popoverHeight = popoverDimensions?.height || MIN_POPOVER_HEIGHT;

	let popoverX = boundingBox.right * canvasProps.zoom + DISTANCE_FROM_DIAGRAM;
	if (canvasProps.minX + containerWidth < popoverX + popoverWidth) {
		// Not enough space on the right, fallback to left
		popoverX =
			boundingBox.left * canvasProps.zoom -
			DISTANCE_FROM_DIAGRAM -
			popoverWidth;
	}

	// Ensure the popover does not go below the bottom edge of the diagram
	let popoverY = diagram.y * canvasProps.zoom - popoverHeight / 2;
	const diagramBottomY = boundingBox.bottom * canvasProps.zoom;
	if (diagramBottomY < popoverY + popoverHeight) {
		popoverY = diagramBottomY - popoverHeight;
	}
	// Ensure popover is within vertical bounds of the viewport
	if (popoverY < canvasProps.minY) {
		popoverY = canvasProps.minY;
	}
	const popoverBottomY = popoverY + popoverHeight;
	const viewportBottomY = canvasProps.minY + containerHeight;
	if (viewportBottomY < popoverBottomY) {
		popoverY = viewportBottomY - popoverHeight;
	}

	return {
		x: popoverX,
		y: popoverY,
	};
};

export const DiagramInfoPopover = memo(DiagramInfoPopoverComponent);
