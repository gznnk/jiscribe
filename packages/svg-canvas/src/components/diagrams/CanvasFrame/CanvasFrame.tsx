import { degreesToRadians } from "@workspace/geometry";
import React, {
	memo,
	useMemo,
	useRef,
	useCallback,
	useState,
	useEffect,
} from "react";

import {
	CanvasFrameElement,
	CanvasFrameDropIndicator,
} from "./CanvasFrameStyled";
import { EVENT_NAME_GROUP_SHAPES } from "../../../constants/core/EventNames";
import {
	BACKGROUND_COLOR,
	BORDER_COLOR,
	BORDER_WIDTH,
	CORNER_RADIUS,
} from "../../../constants/styling/diagrams/CanvasFrameStyling";
import { useEventBus } from "../../../context/EventBusContext";
import { useSvgCanvasState } from "../../../context/SvgCanvasStateContext";
import { useAppendDiagrams } from "../../../hooks/useAppendDiagrams";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useExecutionChain } from "../../../hooks/useExecutionChain";
import { useExtractDiagramsToTopLevel } from "../../../hooks/useExtractDiagramsToTopLevel";
import { useHover } from "../../../hooks/useHover";
import { useSelect } from "../../../hooks/useSelect";
import { DiagramRegistry } from "../../../registry";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { ItemableData } from "../../../types/data/core/ItemableData";
import type { DiagramChangeEvent } from "../../../types/events/DiagramChangeEvent";
import type { DiagramDragDropEvent } from "../../../types/events/DiagramDragDropEvent";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { DiagramHoverChangeEvent } from "../../../types/events/DiagramHoverChangeEvent";
import type { GroupShapesEvent } from "../../../types/events/GroupShapesEvent";
import type { CanvasFrameProps } from "../../../types/props/diagrams/CanvasFrameProps";
import type { Diagram } from "../../../types/state/core/Diagram";
import { collectDiagramDataIds } from "../../../utils/core/collectDiagramDataIds";
import { collectDiagramIds } from "../../../utils/core/collectDiagramIds";
import { filterDragTriggeredTree } from "../../../utils/core/filterDragTriggeredTree";
import { getSelectedDiagrams } from "../../../utils/core/getSelectedDiagrams";
import { mergeProps } from "../../../utils/core/mergeProps";
import { isDiagramPayload } from "../../../utils/execution/isDiagramPayload";
import { isToolPayload } from "../../../utils/execution/isToolPayload";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { isItemableState } from "../../../utils/validation/isItemableState";
import { ConnectPoints } from "../../shapes/ConnectPoints";

/**
 * CanvasFrame component.
 */
const CanvasFrameComponent: React.FC<CanvasFrameProps> = ({
	id,
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	isSelected,
	isRootSelected,
	isAncestorSelected,
	items,
	originX,
	originY,
	connectPoints,
	showConnectPoints = false,
	connectEnabled = true,
	isDragging = false,
	isTransforming = false,
	isTransparent,
	onDrag,
	onClick,
	onSelect,
	onDragOver,
	onDragLeave,
	onDrop,
	onHoverChange,
	onDiagramChange,
	onConnect,
	onPreviewConnectLine,
	onTextChange,
	onExecute,
}) => {
	// Reference to the SVG element for interaction
	const svgRef = useRef<SVGRectElement>({} as SVGRectElement);

	// Get canvas state ref from context
	const canvasStateRef = useSvgCanvasState();

	// Get EventBus instance from context
	const eventBus = useEventBus();

	// Hook for appending diagrams to this frame
	const appendDiagrams = useAppendDiagrams();

	// Hook for extracting diagrams to top level
	const extractDiagramsToTopLevel = useExtractDiagramsToTopLevel();

	// State for managing drop target visual feedback
	const [isDropTarget, setIsDropTarget] = useState(false);
	// Reference to track all child IDs of this frame
	const allChildIdsRef = useRef<Set<string>>(new Set());
	// Reference to track IDs of child items that have left this frame during drag
	const dragLeavingItemIdsRef = useRef<Set<string>>(new Set());
	// Reference to cache innerHTML during drag for performance
	const cachedInnerHTMLRef = useRef<string>("");
	// Reference to the inner svg element containing children
	const innerSvgRef = useRef<SVGSVGElement>(null);
	// Reference to store drag start position for calculating offset
	const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	if (!isDragging) dragStartPosRef.current = { x, y };

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		id,
		x,
		y,
		isRootSelected,
		items,
		isDragging,
		canvasStateRef,
		appendDiagrams,
		onDrag,
		onDragOver,
		onDragLeave,
		onDrop,
		extractDiagramsToTopLevel,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Manage caching of innerHTML
	useEffect(() => {
		if (isRootSelected && innerSvgRef.current) {
			cachedInnerHTMLRef.current = innerSvgRef.current.innerHTML;
		} else if (!isRootSelected) {
			// Clear cache when not root selected
			cachedInnerHTMLRef.current = "";
		}
	}, [isRootSelected]);
	useEffect(() => {
		if (!isDragging && innerSvgRef.current) {
			cachedInnerHTMLRef.current = innerSvgRef.current.innerHTML;
		}
	}, [isDragging]);
	useEffect(() => {
		if (!isSelected) {
			cachedInnerHTMLRef.current = "";
		}
	}, [isSelected]);

	const canAcceptDrop = useCallback((event: DiagramDragDropEvent) => {
		if (event.dropItem.type === "ConnectPoint") {
			return false;
		}

		const {
			id: currentId,
			items: currentItems,
			canvasStateRef,
		} = refBus.current;

		if (event.dropItem.id === currentId) {
			return false;
		}

		// Get selected diagrams from canvas state
		const allDiagrams = canvasStateRef.current?.items || [];
		const selectedDiagrams = getSelectedDiagrams(allDiagrams);

		// Collect all child IDs of this frame
		const allChildIds = collectDiagramDataIds(currentItems);

		// Recursively check selected diagrams for canvas type or matching dropItem.id
		const checkDiagrams = (diagrams: Diagram[]): boolean => {
			for (const diagram of diagrams) {
				// Check if diagram is a child of this frame
				if (allChildIds.has(diagram.id)) {
					return false;
				}

				// Check if diagram has itemableType === "canvas"
				if (isItemableState(diagram)) {
					if (diagram.itemableType === "canvas") {
						return false;
					}
					if (!checkDiagrams(diagram.items)) {
						return false;
					}
				}
			}
			return true;
		};

		// Check all selected diagrams recursively
		if (!checkDiagrams(selectedDiagrams)) {
			return false;
		}

		return true;
	}, []);

	/**
	 * Event handler when diagrams are dropped on this CanvasFrame
	 */
	const handleDrop = useCallback(
		(event: DiagramDragDropEvent) => {
			const {
				id: currentId,
				canvasStateRef,
				appendDiagrams,
				onDrop,
			} = refBus.current;

			setIsDropTarget(false);

			if (canAcceptDrop(event)) {
				// Get selected diagrams from canvas state
				const allDiagrams = canvasStateRef.current?.items || [];
				const selectedDiagrams = getSelectedDiagrams(allDiagrams);

				// Append selected diagrams to this frame
				appendDiagrams(currentId, selectedDiagrams);
			}

			// Only hide ghost if the dropped item is one of this frame's children
			const shouldControlGhost = allChildIdsRef.current.has(event.dropItem.id);
			onDrop?.({
				...event,
				showGhost: shouldControlGhost ? false : undefined,
			});
		},
		[canAcceptDrop],
	);

	const handleDragOver = useCallback(
		(event: DiagramDragDropEvent) => {
			const droppable = canAcceptDrop(event);
			setIsDropTarget(droppable);

			const isChildItem = allChildIdsRef.current.has(event.dropItem.id);

			if (isChildItem) {
				// Child item has returned to the frame, remove from leaving items
				dragLeavingItemIdsRef.current.delete(event.dropItem.id);
			}

			// Only set showGhost to true for external items entering the frame
			// For child items, use undefined to avoid overwriting other handlers
			refBus.current.onDragOver?.({
				...event,
				showGhost: !isChildItem && droppable ? true : undefined,
			});
		},
		[canAcceptDrop],
	);

	const handleDragLeave = useCallback((event: DiagramDragDropEvent) => {
		setIsDropTarget(false);

		const isChildItem = allChildIdsRef.current.has(event.dropItem.id);

		if (isChildItem) {
			// Record that this child item has left the frame
			dragLeavingItemIdsRef.current.add(event.dropItem.id);
		}

		// Only set showGhost to true for child items leaving the frame
		// For external items, use undefined to avoid overwriting other handlers
		refBus.current.onDragLeave?.({
			...event,
			showGhost: isChildItem && !refBus.current.isDragging ? true : undefined,
		});
	}, []);

	// Use individual interaction hooks
	const dragProps = useDrag({
		id,
		type: "CanvasFrame",
		x,
		y,
		ref: svgRef,
		onDrag,
		onDragOver: handleDragOver,
		onDragLeave: handleDragLeave,
		onDrop: handleDrop,
	});

	const clickProps = useClick({
		id,
		x,
		y,
		isSelected,
		isAncestorSelected,
		ref: svgRef,
		onClick,
	});

	const selectProps = useSelect({
		id,
		onSelect,
	});

	const hoverProps = useHover({
		id,
		onHoverChange,
	});

	/**
	 * Wrapped onDrag handler for child elements to track child IDs when drag starts
	 * Note: innerHTML is now cached in useEffect when isRootSelected becomes true
	 */
	const handleChildDrag = useCallback((e: DiagramDragEvent) => {
		const { items, canvasStateRef, extractDiagramsToTopLevel } = refBus.current;
		// Update allChildIdsRef when drag starts
		if (e.eventPhase === "Started") {
			allChildIdsRef.current = collectDiagramIds(items);
		}

		// Propagate the drag event
		refBus.current.onDrag?.(e);

		// Clear the child IDs when drag ends
		if (e.eventPhase === "Ended") {
			// Extract selected items to top level if any child left the frame during drag
			if (dragLeavingItemIdsRef.current.size > 0) {
				// Get selected diagrams from the canvas state
				const selectedDiagrams = getSelectedDiagrams(
					canvasStateRef.current?.items ?? [],
				);

				if (selectedDiagrams.length > 0) {
					// Pass the drag event's eventId to extractDiagramsToTopLevel
					extractDiagramsToTopLevel(selectedDiagrams, e.eventId);
				}
			}

			// Clean up references
			allChildIdsRef.current = new Set();
			dragLeavingItemIdsRef.current = new Set();
		}
	}, []);

	// Handler to propagate child hover events to this frame
	const handleChildHoverChange = useCallback(
		(e: DiagramHoverChangeEvent) => {
			// Propagate child hover event to parent
			onHoverChange?.(e);
			// Also fire hover event for this frame when child is hovered
			onHoverChange?.({
				eventId: e.eventId,
				id,
				isHovered: e.isHovered,
			});
		},
		[id, onHoverChange],
	);

	// Compose props for the background element using mergeProps
	const composedProps = mergeProps(
		dragProps,
		clickProps,
		selectProps,
		hoverProps,
	);

	// Generate rect transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	// Suppress ConnectPoint re-rendering by memoization
	// If separated by key and passed as individual props, each ConnectPoint side
	// performs comparison processing for each key which is inefficient, so detect Shape differences collectively here
	const ownerFrame = useMemo(
		() => ({
			x,
			y,
			width,
			height,
			rotation,
			scaleX,
			scaleY,
		}),
		[x, y, width, height, rotation, scaleX, scaleY],
	);

	// Create shapes within the canvas frame
	// When dragging, extract only the tree containing the drag-triggered diagram
	const renderItems = isDragging ? filterDragTriggeredTree(items) : items;

	const children = renderItems.map((item: DiagramData) => {
		// Ensure that item.type is of DiagramType
		if (!item.type) {
			console.error("Item has no type", item);
			return null;
		}
		const component = DiagramRegistry.getComponent(item.type);
		if (!component) {
			console.warn(`Component not found for type: ${item.type}`);
			return null;
		}
		const props = {
			...item,
			key: item.id,
			onClick,
			onSelect,
			onDrag: handleChildDrag,
			onDragOver,
			onDragLeave,
			onHoverChange: handleChildHoverChange,
			onDiagramChange,
			onConnect,
			onPreviewConnectLine,
			onTextChange,
			onExecute,
		};

		return React.createElement(component, props);
	});

	// Hook for receiving execution results from connected nodes (like PageDesignNode)
	useExecutionChain({
		id,
		onPropagation: async (e) => {
			if (e.eventPhase === "Started") {
				// Notify start of execution
				onExecute?.({
					id,
					eventId: e.eventId,
					eventPhase: "Started",
					payload: {
						format: "text",
						data: "",
					},
				});

				// Clean up existing items
				const changeDiagramEvent: DiagramChangeEvent<ItemableData> = {
					id,
					eventId: e.eventId,
					eventPhase: "Started",
					startDiagram: {
						items,
					},
					endDiagram: {
						items: [],
					},
				};
				onDiagramChange?.(changeDiagramEvent);
				onDiagramChange?.({
					...changeDiagramEvent,
					eventPhase: "Ended",
				});
			}

			if (e.eventPhase === "InProgress") {
				// Handle shape data from PageDesignNode
				if (isDiagramPayload(e.payload)) {
					const shapeData = e.payload.data as Diagram;

					// Validate that it's a valid diagram object
					if (shapeData && shapeData.id && shapeData.type) {
						// Append the received shape to this CanvasFrame
						appendDiagrams(id, [
							{
								...shapeData,
								x: shapeData.x + originX,
								y: shapeData.y + originY,
							},
						]);
					}
				} else if (isToolPayload(e.payload)) {
					// TODO: カスタムフック匁E					// Handle tool execution results (e.g., group_shapes, resize_canvas_frame)
					const toolData = e.payload.data as
						| {
								shapeIds: string[];
								groupId: string;
								name?: string;
								description?: string;
						  }
						| {
								width: number;
								height: number;
						  };

					// Check if this is a group_shapes result
					if (
						"shapeIds" in toolData &&
						Array.isArray(toolData.shapeIds) &&
						toolData.shapeIds.length >= 2 &&
						toolData.groupId
					) {
						const groupEvent: GroupShapesEvent = {
							eventId: e.eventId,
							shapeIds: toolData.shapeIds,
							groupId: toolData.groupId,
							name: toolData.name,
							description: toolData.description,
						};

						eventBus.dispatchEvent(
							new CustomEvent(EVENT_NAME_GROUP_SHAPES, { detail: groupEvent }),
						);
					}
					// Check if this is a resize_canvas_frame result
					else if (
						"width" in toolData &&
						"height" in toolData &&
						typeof toolData.width === "number" &&
						typeof toolData.height === "number"
					) {
						// Calculate new origin (top-left corner) based on new dimensions
						const newOriginX = x - toolData.width / 2;
						const newOriginY = y - toolData.height / 2;

						// Use onDiagramChange to notify the resize for this connected CanvasFrame
						const changeDiagramEvent: DiagramChangeEvent<
							ItemableData & {
								width: number;
								height: number;
								originX: number;
								originY: number;
							}
						> = {
							id,
							eventId: e.eventId,
							eventPhase: "Started",
							startDiagram: {
								items,
								width,
								height,
								originX,
								originY,
							},
							endDiagram: {
								items,
								width: toolData.width,
								height: toolData.height,
								originX: newOriginX,
								originY: newOriginY,
							},
						};
						onDiagramChange?.(changeDiagramEvent);
						onDiagramChange?.({
							...changeDiagramEvent,
							eventPhase: "Ended",
						});
					}
				}
			}

			if (e.eventPhase === "Ended") {
				onExecute?.({
					id,
					eventId: e.eventId,
					eventPhase: "Ended",
					payload: {
						format: "object",
						data: items,
					},
				});
			}
		},
	});

	// Calculate viewBox for clipping content to frame bounds
	// Using absolute coordinates: x - width/2, y - height/2, width, height
	const viewBox = `${x - width / 2} ${y - height / 2} ${width} ${height}`;

	// Calculate drag offset for cached HTML
	const dragOffsetX = x - dragStartPosRef.current.x;
	const dragOffsetY = y - dragStartPosRef.current.y;

	// Determine if we should use cached innerHTML
	const isCacheActive =
		isDragging && isRootSelected && !!cachedInnerHTMLRef.current;

	return (
		<>
			<CanvasFrameElement
				id={id}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				rx={CORNER_RADIUS}
				ry={CORNER_RADIUS}
				fill={BACKGROUND_COLOR}
				stroke={BORDER_COLOR}
				strokeWidth={BORDER_WIDTH}
				isTransparent={isTransparent}
				tabIndex={0}
				cursor="move"
				transform={transform}
				ref={svgRef}
				{...composedProps}
			/>
			<CanvasFrameDropIndicator
				id={`${id}-drop-indicator`}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				rx={CORNER_RADIUS}
				ry={CORNER_RADIUS}
				transform={transform}
				isActive={isDropTarget}
			/>
			<svg
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				viewBox={viewBox}
				transform={transform}
				overflow="hidden"
				ref={innerSvgRef}
			>
				{children}
				{isCacheActive && (
					<g
						transform={`translate(${dragOffsetX}, ${dragOffsetY})`}
						dangerouslySetInnerHTML={{ __html: cachedInnerHTMLRef.current }}
					/>
				)}
			</svg>
			{connectPoints && (
				<ConnectPoints
					ownerId={id}
					ownerFrame={ownerFrame}
					connectPoints={connectPoints}
					showConnectPoints={showConnectPoints}
					shouldRender={!isDragging && !isTransforming && !isSelected}
					connectEnabled={connectEnabled}
					onConnect={onConnect}
					onPreviewConnectLine={onPreviewConnectLine}
				/>
			)}
		</>
	);
};

export const CanvasFrame = memo(CanvasFrameComponent);
