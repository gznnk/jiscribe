import type React from "react";

import type { DiagramSelectEvent } from "../types/events/DiagramSelectEvent";
import { newEventId } from "../utils/core/newEventId";

/**
 * Type definition for select props
 */
export type SelectProps = {
	id: string;
	onSelect?: (e: DiagramSelectEvent) => void;
};

/**
 * Custom hook to handle selection events
 *
 * @param {SelectProps} props Select props
 * @param {string} props.id ID of the element to be selectable
 * @param {(e: DiagramSelectEvent) => void} [props.onSelect] Event handler for selection
 */
export const useSelect = (props: SelectProps) => {
	const { id, onSelect } = props;

	/**
	 * Pointer down event handler within the select area
	 */
	const handlePointerDown = (e: React.PointerEvent<SVGElement>): void => {
		if (e.button !== 0) {
			// Do nothing for non-left clicks
			return;
		}
		// Process the event only if the ID of the element where the pointer event occurred matches the ID of this select area
		if ((e.target as HTMLElement).id === id) {
			// Fire select event
			onSelect?.({
				eventId: newEventId(),
				id,
			});
		}
	};

	return {
		onPointerDown: handlePointerDown,
	};
};
