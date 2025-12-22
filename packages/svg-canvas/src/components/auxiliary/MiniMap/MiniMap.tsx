import { EventBus } from "@workspace/event-bus";
import React, { memo, useCallback, useMemo, useState } from "react";

import {
	MiniMapBackground,
	MiniMapContainer,
	MiniMapSvg,
	ViewportIndicator,
} from "./MiniMapStyled";
import type { MiniMapProps } from "./MiniMapTypes";
import {
	calculateCombinedCanvasBounds,
	calculateCanvasViewportBounds,
	constrainViewportPosition,
} from "./MiniMapUtils";
import { EventBusProvider } from "../../../context/EventBusContext";
import { DiagramRegistry } from "../../../registry";

/**
 * MiniMap component that shows an overview of the entire canvas
 * with current viewport indicator
 */
const MiniMapComponent: React.FC<MiniMapProps> = ({
	items,
	minX,
	minY,
	containerWidth,
	containerHeight,
	zoom,
	width = 200,
	height = 150,
	onNavigate,
}) => {
	// Create a dummy EventBus for MiniMap diagram components
	const dummyEventBus = useMemo(() => new EventBus(), []);

	// Calculate all minimap properties in a single memoized computation for efficiency
	const { canvasBounds, viewportRect } = useMemo(() => {
		const viewportBounds = calculateCanvasViewportBounds(
			minX,
			minY,
			containerWidth,
			containerHeight,
			zoom,
		);

		const bounds = calculateCombinedCanvasBounds(items, viewportBounds);

		// For the new coordinate system, viewport rect is just the viewport bounds in canvas coordinates
		const rect = {
			x: viewportBounds.x,
			y: viewportBounds.y,
			width: viewportBounds.width,
			height: viewportBounds.height,
		};

		return {
			canvasBounds: bounds,
			viewportRect: rect,
		};
	}, [items, minX, minY, containerWidth, containerHeight, zoom]);

	// Handle navigation based on click coordinates
	const handleNavigate = useCallback(
		(clientX: number, clientY: number, svgElement: SVGSVGElement) => {
			if (!onNavigate) return;

			// Get the bounding rectangle of the SVG element
			const rect = svgElement.getBoundingClientRect();

			// Convert client coordinates to SVG coordinates using the viewBox
			const svgX =
				((clientX - rect.left) / rect.width) * canvasBounds.width +
				canvasBounds.x;
			const svgY =
				((clientY - rect.top) / rect.height) * canvasBounds.height +
				canvasBounds.y;

			// Calculate new viewport center position
			const viewportWidth = containerWidth / zoom;
			const viewportHeight = containerHeight / zoom;
			const newMinX = (svgX - viewportWidth / 2) * zoom;
			const newMinY = (svgY - viewportHeight / 2) * zoom;

			// Apply viewport position constraints
			const constrained = constrainViewportPosition(
				newMinX,
				newMinY,
				items,
				containerWidth,
				containerHeight,
				zoom,
			);

			onNavigate(constrained.minX, constrained.minY);
		},
		[onNavigate, canvasBounds, containerWidth, containerHeight, zoom, items],
	);

	// State management for drag operations
	const [dragOffsetRatio, setDragOffsetRatio] = useState({ x: 0, y: 0 });
	const [isViewportInteraction, setIsViewportInteraction] = useState(false);

	// Click handler for minimap navigation
	const handleClick = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			// Navigate to the clicked position
			handleNavigate(e.clientX, e.clientY, e.currentTarget);
		},
		[handleNavigate],
	);

	// ViewportIndicator event handlers
	const handleViewportPointerDown = useCallback(
		(e: React.PointerEvent<SVGRectElement>) => {
			setIsViewportInteraction(true);
			e.currentTarget.setPointerCapture(e.pointerId);

			// Calculate relative position within viewport
			const svgElement = e.currentTarget.ownerSVGElement;
			if (!svgElement) return;

			// Get the bounding rectangle of the SVG element
			const rect = svgElement.getBoundingClientRect();

			// Convert client coordinates to SVG coordinates using the viewBox
			const svgX =
				((e.clientX - rect.left) / rect.width) * canvasBounds.width +
				canvasBounds.x;
			const svgY =
				((e.clientY - rect.top) / rect.height) * canvasBounds.height +
				canvasBounds.y;

			// Calculate offset ratio within the viewport indicator
			const offsetRatio = {
				x: (svgX - viewportRect.x) / viewportRect.width,
				y: (svgY - viewportRect.y) / viewportRect.height,
			};
			setDragOffsetRatio(offsetRatio);
		},
		[viewportRect, canvasBounds],
	);

	// Handle pointer move event to update viewport position
	const handleViewportPointerMove = useCallback(
		(e: React.PointerEvent<SVGRectElement>) => {
			if (!isViewportInteraction) return;

			const svgElement = e.currentTarget.ownerSVGElement;
			if (!svgElement) return;

			// Get the bounding rectangle of the SVG element
			const rect = svgElement.getBoundingClientRect();

			// Convert client coordinates to SVG coordinates using the viewBox
			const svgX =
				((e.clientX - rect.left) / rect.width) * canvasBounds.width +
				canvasBounds.x;
			const svgY =
				((e.clientY - rect.top) / rect.height) * canvasBounds.height +
				canvasBounds.y;

			// Apply drag offset
			const adjustedX = svgX - dragOffsetRatio.x * viewportRect.width;
			const adjustedY = svgY - dragOffsetRatio.y * viewportRect.height;

			// Convert to viewport coordinates
			const newMinX = adjustedX * zoom;
			const newMinY = adjustedY * zoom;

			// Apply viewport position constraints
			const constrained = constrainViewportPosition(
				newMinX,
				newMinY,
				items,
				containerWidth,
				containerHeight,
				zoom,
			);

			if (onNavigate) {
				onNavigate(constrained.minX, constrained.minY);
			}
		},
		[
			isViewportInteraction,
			dragOffsetRatio,
			viewportRect,
			canvasBounds,
			zoom,
			onNavigate,
			items,
			containerWidth,
			containerHeight,
		],
	);

	// Handle pointer up event to release interaction state
	const handleViewportPointerUp = useCallback(
		(e: React.PointerEvent<SVGRectElement>) => {
			// Reset interaction state
			setIsViewportInteraction(false);

			// Release pointer capture from the ViewportIndicator element
			e.currentTarget.releasePointerCapture(e.pointerId);
		},
		[],
	);

	// Prevent click events on the viewport to avoid triggering navigation
	const handleViewportClick = useCallback(
		(e: React.MouseEvent<SVGRectElement>) => {
			// Prevent click from propagating to the SVG
			e.stopPropagation();
		},
		[],
	);

	// Generate minimap items by rendering lightweight diagram components
	const diagramElements = useMemo(() => {
		return items.map((item) => {
			const minimapComponent = DiagramRegistry.getMinimapComponent(item.type);
			if (!minimapComponent) {
				console.warn(`Minimap component not found for type: ${item.type}`);
				return null;
			}

			// Create props for the minimap component
			// We pass minimal props to avoid any interactive behavior in minimap
			const props = {
				...item,
				key: item.id,
				isSelected: false,
				showOutline: false,
				showConnectPoints: false,
				isTransforming: false,
				isDragging: false,
				isTextEditing: false,
			};

			return React.createElement(minimapComponent, props);
		});
	}, [items]);

	return (
		<MiniMapContainer width={width} height={height}>
			<MiniMapSvg
				width={width}
				height={height}
				viewBox={`${canvasBounds.x} ${canvasBounds.y} ${canvasBounds.width} ${canvasBounds.height}`}
				onClick={handleClick}
			>
				{/* Background */}
				<MiniMapBackground
					x={canvasBounds.x}
					y={canvasBounds.y}
					width={canvasBounds.width}
					height={canvasBounds.height}
				/>

				{/* Render actual diagram items */}
				<EventBusProvider eventBus={dummyEventBus}>
					{diagramElements}
				</EventBusProvider>

				{/* Viewport indicator */}
				<ViewportIndicator
					x={viewportRect.x}
					y={viewportRect.y}
					width={viewportRect.width}
					height={viewportRect.height}
					onPointerDown={handleViewportPointerDown}
					onPointerMove={handleViewportPointerMove}
					onPointerUp={handleViewportPointerUp}
					onClick={handleViewportClick}
				/>
			</MiniMapSvg>
		</MiniMapContainer>
	);
};

export const MiniMap = memo(MiniMapComponent);
