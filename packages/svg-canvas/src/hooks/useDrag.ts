import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { HandleEdgeScrollArgs } from "./useAutoEdgeScroll";
import { useAutoEdgeScroll } from "./useAutoEdgeScroll";
import { DRAG_DEAD_ZONE } from "../constants/core/Constants";
import { EVENT_NAME_BROADCAST_DRAG } from "../constants/core/EventNames";
import { useEventBus } from "../context/EventBusContext";
import { useSvgViewport } from "../context/SvgViewportContext";
import type { ArrowKeyCode } from "../types/core/ArrowKeyCode";
import type { DiagramType } from "../types/core/DiagramType";
import type { Point } from "../types/core/Point";
import type { DiagramDragDropEvent } from "../types/events/DiagramDragDropEvent";
import type { DiagramDragEvent } from "../types/events/DiagramDragEvent";
import type { DiagramPointerEvent } from "../types/events/DiagramPointerEvent";
import type { EventPhase } from "../types/events/EventPhase";
import { getSvgPoint } from "../utils/core/getSvgPoint";
import { newEventId } from "../utils/core/newEventId";
import { getArrowDirection } from "../utils/keyboard/getArrowDirection";
import { hasAnyArrowKeyCode } from "../utils/keyboard/hasAnyArrowKeyCode";
import { isArrowKeyCode } from "../utils/keyboard/isArrowKeyCode";
import { isPointerOver } from "../utils/shapes/common/isPointerOver";

/**
 * Type definition for broadcast drag event
 */
type BroadcastDragEvent = {
	eventId: string;
	eventPhase: EventPhase;
	id: string;
	type: DiagramType;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	clientX: number;
	clientY: number;
};

/**
 * Type definition for drag area props
 */
export type DragProps = {
	id: string;
	type?: DiagramType;
	x: number;
	y: number;
	disableAutoEdgeScroll?: boolean;
	ref: React.RefObject<SVGElement>;
	onPointerDown?: (e: DiagramPointerEvent) => void;
	onPointerUp?: (e: DiagramPointerEvent) => void;
	onDrag?: (e: DiagramDragEvent) => void;
	onDragOver?: (e: DiagramDragDropEvent) => void;
	onDragLeave?: (e: DiagramDragDropEvent) => void;
	onDrop?: (e: DiagramDragDropEvent) => void;
	dragPositioningFunction?: (x: number, y: number) => Point;
};

/**
 * Custom hook to create a draggable area
 *
 * @param {DragProps} props Drag area props
 * @param {string} props.id ID (set the same ID to the element to be draggable. Otherwise it will not work correctly)
 * @param {DiagramType} [props.type] Type of diagram
 * @param {number} props.x X coordinate
 * @param {number} props.y Y coordinate
 * @param {React.RefObject<SVGElement>} props.ref Reference to the element to be draggable
 * @param {(e: DiagramPointerEvent) => void} [props.onPointerDown] Event handler for pointer down
 * @param {(e: DiagramPointerEvent) => void} [props.onPointerUp] Event handler for pointer up
 * @param {(e: DiagramDragEvent) => void} [props.onDrag] Event handler for dragging
 * @param {(e: DiagramDragDropEvent) => void} [props.onDragOver] Event handler for drag over
 * @param {(e: DiagramDragDropEvent) => void} [props.onDragLeave] Event handler for drag leave
 * @param {(e: DiagramDragDropEvent) => void} [props.onDrop] Event handler for drop
 * @param {(x: number, y: number) => Point} [props.dragPositioningFunction] Drag position transformation function
 */
export const useDrag = (props: DragProps) => {
	const eventBus = useEventBus();
	const svgViewport = useSvgViewport();
	const {
		id,
		x,
		y,
		type,
		ref,
		disableAutoEdgeScroll = false,
		onPointerDown,
		onPointerUp,
		onDrag,
		onDragOver,
		onDragLeave,
		onDrop,
		dragPositioningFunction,
	} = props;

	// Flag whether dragging
	const [isDragging, setIsDragging] = useState(false);
	// Flag whether pointer is pressed down in this drag area
	const isPointerDown = useRef(false);
	// Flag whether dragging with arrow keys
	const isArrowDragging = useRef(false);
	// Flag whether drag entered
	const dragEntered = useRef(false);
	// Drag area coordinates at drag start
	const startX = useRef(0);
	const startY = useRef(0);
	// The offset between the center and the pointer.
	const offsetXBetweenCenterAndPointer = useRef(0);
	const offsetYBetweenCenterAndPointer = useRef(0);
	// The distance moved while keyboard dragging
	const keyboardDragDeltaX = useRef(0);
	const keyboardDragDeltaY = useRef(0);
	// The eventId of the last keyboard drag event
	const lastKeyboardEventId = useRef("");
	// The last position of the keyboard drag event
	const lastKeyboardDragEnd = useRef<Point>({ x: 0, y: 0 });
	// Set of currently pressed arrow keys
	const pressedArrowKeys = useRef<Set<ArrowKeyCode>>(new Set());

	/**
	 * Get the drag area coordinates from the SVG point during dragging.
	 *
	 * @param svgPoint - Pointer position in SVG coordinate system
	 * @returns Drag area coordinates
	 */
	const getPointOnDrag = (svgPoint: Point): Point => {
		let newX = svgPoint.x - offsetXBetweenCenterAndPointer.current;
		let newY = svgPoint.y - offsetYBetweenCenterAndPointer.current;

		// If a drag position transformation function is specified, apply that function
		if (dragPositioningFunction) {
			const p = dragPositioningFunction(newX, newY);
			newX = p.x;
			newY = p.y;
		}

		return {
			x: newX,
			y: newY,
		};
	};

	// Register global broadcast drag event listener
	// Use ref to hold referenced values to avoid frequent handler generation
	const refBusVal = {
		// Properties
		id,
		x,
		y,
		type,
		ref,
		onDrag,
		onDragOver,
		onDragLeave,
		onDrop,
		// Internal variables and functions
		svgViewport,
		isDragging,
		getPointOnDrag,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Pointer down event handler within the drag area
	 */
	const handlePointerDown = (e: React.PointerEvent<SVGElement>): void => {
		if (e.button !== 0) {
			// Do nothing for non-left clicks
			return;
		}

		// Process the event only if the ID of the element where the pointer event occurred matches the ID of this drag area
		if ((e.target as HTMLElement).id === id) {
			// Set pointer capture
			e.currentTarget.setPointerCapture(e.pointerId);

			// Set the flag that the pointer is pressed
			isPointerDown.current = true;

			// Remember the drag area coordinates at drag start
			startX.current = x;
			startY.current = y;
			// Store the offset between the center and the pointer
			const svgPoint = getSvgPoint(e.clientX, e.clientY, ref.current);
			offsetXBetweenCenterAndPointer.current = svgPoint.x - x;
			offsetYBetweenCenterAndPointer.current = svgPoint.y - y;

			// Fire pointer down event
			onPointerDown?.({
				eventId: newEventId(),
				id,
			});
		}
	};

	/**
	 * Handle edge scrolling with custom logic for drag events
	 */
	const handleEdgeScroll = useCallback((state: HandleEdgeScrollArgs) => {
		// Bypass references to avoid function creation in every render
		const { id, onDrag, getPointOnDrag } = refBus.current;

		const newEndPos = getPointOnDrag(state.cursorPos);

		// dispatch dragging event
		const dragEvent = {
			eventId: newEventId(),
			eventPhase: "InProgress",
			id,
			startX: startX.current,
			startY: startY.current,
			endX: newEndPos.x,
			endY: newEndPos.y,
			cursorX: state.cursorPos.x,
			cursorY: state.cursorPos.y,
			minX: state.minX,
			minY: state.minY,
		} as DiagramDragEvent;

		// Fire drag event
		onDrag?.(dragEvent);
	}, []);

	// Use the shared auto edge scroll hook
	const { autoEdgeScroll, clearEdgeScroll } = useAutoEdgeScroll(
		svgViewport,
		handleEdgeScroll,
	);

	/**
	 * Pointer move event handler within the drag area
	 */
	const handlePointerMove = (e: React.PointerEvent<SVGElement>): void => {
		if (!isPointerDown.current) {
			// Do nothing if pointer is not pressed down in this drag area
			return;
		}

		// Calculate SVG coordinates first
		const svgCursorPoint = getSvgPoint(e.clientX, e.clientY, ref.current);
		// Get drag coordinates
		const dragPoint = getPointOnDrag(svgCursorPoint);
		// Generate event ID
		const eventId = newEventId();

		// Create event information during dragging
		const dragEvent = {
			eventId,
			eventPhase: "InProgress",
			id,
			startX: startX.current,
			startY: startY.current,
			endX: dragPoint.x,
			endY: dragPoint.y,
			cursorX: svgCursorPoint.x,
			cursorY: svgCursorPoint.y,
		} as DiagramDragEvent;

		// Create broadcast drag event information
		const broadcastDragEvent = {
			eventId,
			eventPhase: "InProgress",
			id,
			type,
			startX: startX.current,
			startY: startY.current,
			endX: dragPoint.x,
			endY: dragPoint.y,
			clientX: e.clientX,
			clientY: e.clientY,
		};
		if (
			!isDragging &&
			(Math.abs(dragPoint.x - startX.current) > DRAG_DEAD_ZONE ||
				Math.abs(dragPoint.y - startY.current) > DRAG_DEAD_ZONE)
		) {
			// Start dragging when not dragging and pointer movement exceeds a certain threshold
			onDrag?.({
				...dragEvent,
				eventPhase: "Started",
			});

			// Fire dragging event for handling by shapes without parent-child relationship
			eventBus.dispatchEvent(
				new CustomEvent(EVENT_NAME_BROADCAST_DRAG, {
					detail: {
						...broadcastDragEvent,
						eventPhase: "Started",
					},
				}),
			);

			setIsDragging(true);
			return;
		}

		if (!isDragging) {
			// Do nothing when not dragging
			return;
		}

		if (!disableAutoEdgeScroll) {
			// Use the shared auto edge scroll functionality
			if (
				autoEdgeScroll(svgCursorPoint, {
					dragPoint,
					dragPositioningFunction,
				})
			) {
				return;
			}
		}

		// Fire dragging event
		onDrag?.(dragEvent);

		// Fire dragging event for handling by shapes without parent-child relationship
		eventBus.dispatchEvent(
			new CustomEvent(EVENT_NAME_BROADCAST_DRAG, {
				detail: broadcastDragEvent,
			}),
		);
	};

	/**
	 * Pointer up event handler within the drag area
	 */
	const handlePointerUp = (e: React.PointerEvent<SVGElement>): void => {
		// Release pointer capture
		e.currentTarget.releasePointerCapture(e.pointerId);
		// Generate event ID
		const eventId = newEventId();

		if (isDragging) {
			// Clear edge scroll if it exists
			clearEdgeScroll();

			// Calculate SVG coordinates first
			const svgCursorPoint = getSvgPoint(e.clientX, e.clientY, ref.current);
			// Get drag coordinates
			const dragPoint = getPointOnDrag(svgCursorPoint);

			// Fire drag end event if dragging was in progress
			onDrag?.({
				eventId,
				eventPhase: "Ended",
				id,
				startX: startX.current,
				startY: startY.current,
				endX: dragPoint.x,
				endY: dragPoint.y,
				cursorX: svgCursorPoint.x,
				cursorY: svgCursorPoint.y,
			});
			// Fire drag end event for handling by shapes without parent-child relationship
			eventBus.dispatchEvent(
				new CustomEvent(EVENT_NAME_BROADCAST_DRAG, {
					detail: {
						eventId,
						eventPhase: "Ended",
						id,
						type,
						startX: startX.current,
						startY: startY.current,
						endX: dragPoint.x,
						endY: dragPoint.y,
						clientX: e.clientX,
						clientY: e.clientY,
					} as BroadcastDragEvent,
				}),
			);
		}

		// Fire pointer up event
		onPointerUp?.({
			eventId,
			id,
		});

		// Clear flags
		setIsDragging(false);
		isPointerDown.current = false;
	};

	/**
	 * Key press event handler
	 */
	const handleKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
		// Do nothing while pointer is down
		if (isPointerDown.current) {
			return;
		}

		/**
		 * Move point by arrow keys
		 *
		 * @param dx x coordinate offset
		 * @param dy y coordinate offset
		 */
		const movePoint = (dx: number, dy: number) => {
			const eventPhase = isArrowDragging.current ? "InProgress" : "Started";

			// Start arrow key dragging if not already started
			if (!isArrowDragging.current) {
				// Remember the start position when starting arrow key dragging
				startX.current = x;
				startY.current = y;

				// Initialize keyboard drag delta
				keyboardDragDeltaX.current = 0;
				keyboardDragDeltaY.current = 0;

				// Initialize pressed arrow keys set
				pressedArrowKeys.current = new Set();

				// Generate event ID
				lastKeyboardEventId.current = newEventId();

				// Mark as arrow key dragging
				isArrowDragging.current = true;
			}

			// Accumulate the distance moved by arrow keys
			keyboardDragDeltaX.current += dx;
			keyboardDragDeltaY.current += dy;

			let newPoint = {
				x: startX.current + keyboardDragDeltaX.current,
				y: startY.current + keyboardDragDeltaY.current,
			};

			if (dragPositioningFunction) {
				newPoint = dragPositioningFunction(newPoint.x, newPoint.y);
			}

			lastKeyboardDragEnd.current = newPoint;

			// For keyboard operations, treat the shape's center as the cursor position
			const dragEvent = {
				eventId: lastKeyboardEventId.current,
				eventPhase,
				id,
				startX: startX.current,
				startY: startY.current,
				endX: newPoint.x,
				endY: newPoint.y,
				cursorX: newPoint.x, // Use shape center as cursor position
				cursorY: newPoint.y, // Use shape center as cursor position
			} as DiagramDragEvent;

			onDrag?.(dragEvent);
		};

		if (isArrowKeyCode(e.code)) {
			// Add the pressed arrow key to the set
			pressedArrowKeys.current.add(e.code);
		}

		if (hasAnyArrowKeyCode(pressedArrowKeys.current)) {
			const direction = getArrowDirection(pressedArrowKeys.current);
			movePoint(direction.x, direction.y);
		}
	};

	/**
	 * Key up event handler
	 */
	const handleKeyUp = (e: React.KeyboardEvent<SVGGElement>) => {
		// Do nothing while pointer is down
		if (isPointerDown.current) {
			return;
		}

		if (isArrowDragging.current) {
			// Create event information for arrow key movement completion
			const dragEvent = {
				eventId: lastKeyboardEventId.current,
				eventPhase: "Ended",
				id,
				startX: startX.current,
				startY: startY.current,
				endX: lastKeyboardDragEnd.current.x,
				endY: lastKeyboardDragEnd.current.y,
				cursorX: lastKeyboardDragEnd.current.x, // Use shape center as cursor position
				cursorY: lastKeyboardDragEnd.current.y, // Use shape center as cursor position
			} as DiagramDragEvent;

			if (isArrowKeyCode(e.code)) {
				// Remove the released arrow key from the set
				pressedArrowKeys.current.delete(e.code);
			}

			if (!hasAnyArrowKeyCode(pressedArrowKeys.current)) {
				// When arrow key is released, fire drag end event to notify SvgCanvas side of coordinate update and update coordinates
				onDrag?.(dragEvent);

				// Mark arrow key drag as ended
				isArrowDragging.current = false;

				// Reset the last keyboard event ID
				lastKeyboardEventId.current = "";
				// Reset keyboard drag deltas
				keyboardDragDeltaX.current = 0;
				keyboardDragDeltaY.current = 0;
				// Reset start position
				startX.current = 0;
				startY.current = 0;
				// Reset last keyboard drag end position
				lastKeyboardDragEnd.current = { x: 0, y: 0 };
			}
		}
	};

	useEffect(() => {
		let handleBroadcastDrag: (e: CustomEvent) => void;
		const { onDragOver, onDrop } = refBus.current;

		if (onDragOver || onDrop) {
			handleBroadcastDrag = (e: CustomEvent) => {
				// Get reference values via refBus
				const { id, x, y, type, ref, onDragOver, onDragLeave } = refBus.current;
				const customEvent = e as CustomEvent<BroadcastDragEvent>;

				// Create drag & drop event information
				const dragDropEvent = {
					eventId: customEvent.detail.eventId,
					dropItem: {
						id: customEvent.detail.id,
						type: customEvent.detail.type,
						x: customEvent.detail.startX,
						y: customEvent.detail.startY,
					},
					dropTargetItem: {
						id,
						type,
						x,
						y,
					},
				};

				if (
					customEvent.detail.type !== undefined &&
					customEvent.detail.id !== id &&
					isPointerOver(
						ref,
						customEvent.detail.clientX,
						customEvent.detail.clientY,
					)
				) {
					if (customEvent.detail.eventPhase === "Ended") {
						onDrop?.(dragDropEvent);
					} else {
						if (!dragEntered.current) {
							dragEntered.current = true;
							onDragOver?.(dragDropEvent);
						}
					}
				} else if (dragEntered.current) {
					dragEntered.current = false;
					onDragLeave?.(dragDropEvent);
				}
			};
			eventBus.addEventListener(EVENT_NAME_BROADCAST_DRAG, handleBroadcastDrag);
		}

		return () => {
			if (handleBroadcastDrag) {
				eventBus.removeEventListener(
					EVENT_NAME_BROADCAST_DRAG,
					handleBroadcastDrag,
				);
			}
		};
	}, [eventBus]);

	return {
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
		onKeyDown: handleKeyDown,
		onKeyUp: handleKeyUp,
	};
};
