import { type RefObject, useEffect, useMemo, useState } from "react";

import { InteractionState } from "../../../../canvas/types/InteractionState";
import type { SvgCanvasProps } from "../../../../canvas/types/SvgCanvasProps";
import { DISTANCE_FROM_DIAGRAM } from "../../../../constants/styling/menus/DiagramMenuStyling";
import type { RectangleVertices } from "../../../../types/core/RectangleVertices";
import type { Diagram } from "../../../../types/state/core/Diagram";
import { calcRectangleVertices } from "../../../../utils/math/geometry/calcRectangleVertices";
import { isFrame } from "../../../../utils/validation/isFrame";

export type UseDiagramMenuDisplayProps = {
	canvasProps: SvgCanvasProps;
	containerWidth: number;
	containerHeight: number;
	menuRef: RefObject<HTMLDivElement | null>;
	selectedItems: Diagram[];
	singleSelectedItem: Diagram | undefined;
};

export type UseDiagramMenuDisplayReturn = {
	shouldRender: boolean;
	menuPosition: { x: number; y: number };
	shouldDisplayMenu: boolean;
};

/**
 * Hook for managing diagram menu display and position.
 *
 * This hook manages:
 * - Menu visibility based on selection and interaction state
 * - Menu position calculation with viewport constraints
 * - Selected items tracking and change detection
 * - Menu dimensions measurement from the DOM
 *
 * The menu is positioned below the diagram by default, but will be moved above
 * if it would overflow the bottom of the viewport. Horizontal positioning is
 * centered on the diagram and adjusted to fit within viewport boundaries.
 */
export const useDiagramMenuDisplay = (
	props: UseDiagramMenuDisplayProps,
): UseDiagramMenuDisplayReturn => {
	const {
		canvasProps,
		containerWidth,
		containerHeight,
		menuRef,
		selectedItems,
		singleSelectedItem,
	} = props;
	const { interactionState, multiSelectGroup, zoom, minX, minY } = canvasProps;

	const [previousSelectedItemsId, setPreviousSelectedItemsId] =
		useState<string>("");
	const [menuDimensions, setMenuDimensions] = useState({
		width: 0,
		height: 40,
	});

	// Create selected items ID string for dependency tracking
	const selectedItemsId = selectedItems.map((item) => item.id).join(",");

	// Check if the diagram menu should be rendered
	const shouldRender =
		selectedItems.length > 0 && interactionState === InteractionState.Idle;

	// Determine if menu should be displayed (z-index control)
	// Menu should be displayed when selection hasn't changed
	const shouldDisplayMenu = previousSelectedItemsId === selectedItemsId;

	// Update menu dimensions when DOM changes or menu visibility changes
	useEffect(() => {
		if (menuRef.current && shouldRender) {
			const rect = menuRef.current.getBoundingClientRect();
			setMenuDimensions({ width: rect.width, height: rect.height });
			setPreviousSelectedItemsId(selectedItemsId);
		}
	}, [menuRef, shouldRender, selectedItemsId]);

	// Calculate menu position
	const menuPosition = useMemo(() => {
		// Get diagram position and size for menu positioning
		let x = 0,
			y = 0,
			width = 0,
			height = 0,
			rotation = 0,
			scaleX = 1,
			scaleY = 1;

		if (multiSelectGroup) {
			({ x, y, width, height, rotation, scaleX, scaleY } = multiSelectGroup);
		} else if (isFrame(singleSelectedItem)) {
			({ x, y, width, height, rotation, scaleX, scaleY } = singleSelectedItem);
		}

		const vertices = calcRectangleVertices({
			x: x * zoom,
			y: y * zoom,
			width: width * zoom,
			height: height * zoom,
			rotation,
			scaleX,
			scaleY,
		});

		const diagramCenterX = x * zoom;
		const menuWidth = menuDimensions.width;
		const menuHeight = menuDimensions.height;

		// Get diagram bottom Y position
		const diagramBottomY = Object.keys(vertices).reduce((max, key) => {
			const vertex = vertices[key as keyof RectangleVertices];
			return Math.max(max, vertex.y);
		}, Number.NEGATIVE_INFINITY);

		// Default position: below the diagram, centered
		let menuX = diagramCenterX - menuWidth / 2;
		let menuY = diagramBottomY + DISTANCE_FROM_DIAGRAM;

		// Check if menu overflows viewport horizontally
		const viewportRight = minX + containerWidth;
		if (menuX + menuWidth > viewportRight) {
			// Adjust to fit within right boundary
			menuX = viewportRight - menuWidth;
		}
		if (menuX < minX) {
			// Adjust to fit within left boundary
			menuX = minX;
		}

		// Check if menu overflows viewport vertically (bottom)
		const viewportBottom = minY + containerHeight;
		if (menuY + menuHeight > viewportBottom) {
			// Position above the diagram
			const diagramTopY = Object.keys(vertices).reduce((min, key) => {
				const vertex = vertices[key as keyof RectangleVertices];
				return Math.min(min, vertex.y);
			}, Number.POSITIVE_INFINITY);
			menuY = diagramTopY - DISTANCE_FROM_DIAGRAM - menuHeight;
		}

		// Ensure menu doesn't go above viewport
		if (menuY < minY) {
			menuY = minY;
		}

		return { x: Math.round(menuX), y: Math.round(menuY) };
	}, [
		menuDimensions,
		multiSelectGroup,
		singleSelectedItem,
		zoom,
		containerWidth,
		containerHeight,
		minX,
		minY,
	]);

	return {
		shouldRender,
		menuPosition,
		shouldDisplayMenu,
	};
};
