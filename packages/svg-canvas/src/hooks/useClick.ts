import type React from "react";
import { useRef } from "react";

import { DRAG_DEAD_ZONE } from "../constants/core/Constants";
import type { DiagramClickEvent } from "../types/events/DiagramClickEvent";
import { getSvgPoint } from "../utils/core/getSvgPoint";
import { newEventId } from "../utils/core/newEventId";

/**
 * Type definition for click props
 */
export type ClickProps = {
	id: string;
	x: number;
	y: number;
	isSelected?: boolean;
	isAncestorSelected?: boolean;
	ref: React.RefObject<SVGElement>;
	onClick?: (e: DiagramClickEvent) => void;
};

/**
 * Custom hook to handle click events
 *
 * @param {ClickProps} props Click props
 * @param {string} props.id ID of the element
 * @param {number} props.x X coordinate
 * @param {number} props.y Y coordinate
 * @param {React.RefObject<SVGElement>} props.ref Reference to the element
 * @param {(e: DiagramClickEvent) => void} [props.onClick] Event handler for click
 */
export const useClick = (props: ClickProps) => {
	const { id, x, y, ref, isSelected, isAncestorSelected, onClick } = props;

	// Flag whether pointer is pressed down in this click area
	const isPointerDown = useRef(false);
	// Flag whether dragging
	const isDragging = useRef(false);
	// Flag whether isSelected is true on pointer down
	const isSelectedOnPointerDown = useRef(false);
	// Flag whether isAncestorSelected is true on pointer down
	const isAncestorSelectedOnPointerDown = useRef(false);
	// Click area coordinates at pointer down
	const startX = useRef(0);
	const startY = useRef(0);

	/**
	 * Pointer down event handler within the click area
	 */
	const handlePointerDown = (e: React.PointerEvent<SVGElement>): void => {
		if (e.button !== 0) {
			// Do nothing for non-left clicks
			return;
		}

		// Process the event only if the ID of the element where the pointer event occurred matches the ID of this click area
		if ((e.target as HTMLElement).id === id) {
			// Set the flag that the pointer is pressed
			isPointerDown.current = true;
			// Set the flag whether isSelected is true on pointer down
			isSelectedOnPointerDown.current = isSelected ?? false;
			// Set the flag whether isAncestorSelected is true on pointer down
			isAncestorSelectedOnPointerDown.current = isAncestorSelected ?? false;

			// Remember the click area coordinates at pointer down
			startX.current = x;
			startY.current = y;
		}
	};

	/**
	 * Pointer move event handler within the click area
	 */
	const handlePointerMove = (e: React.PointerEvent<SVGElement>): void => {
		if (!isPointerDown.current) {
			// Do nothing if pointer is not pressed down in this click area
			return;
		}
		// Get current SVG coordinates
		const svgPoint = getSvgPoint(e.clientX, e.clientY, ref.current);

		if (
			!isDragging.current &&
			(Math.abs(svgPoint.x - startX.current) > DRAG_DEAD_ZONE ||
				Math.abs(svgPoint.y - startY.current) > DRAG_DEAD_ZONE)
		) {
			// Start dragging when not dragging and pointer movement exceeds a certain threshold
			isDragging.current = true;
		}
	};

	/**
	 * Pointer up event handler within the click area
	 */
	const handlePointerUp = (e: React.PointerEvent<SVGElement>): void => {
		if (isPointerDown.current && !isDragging.current) {
			// If pointer up after clicking (not dragging), notify click event
			onClick?.({
				eventId: newEventId(),
				id,
				isSelectedOnPointerDown: isSelectedOnPointerDown.current,
				isAncestorSelectedOnPointerDown:
					isAncestorSelectedOnPointerDown.current,
				clientX: e.clientX,
				clientY: e.clientY,
			});
		}

		// Clear flags
		isDragging.current = false;
		isPointerDown.current = false;
		isSelectedOnPointerDown.current = false;
		isAncestorSelectedOnPointerDown.current = false;
	};

	return {
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
	};
};
