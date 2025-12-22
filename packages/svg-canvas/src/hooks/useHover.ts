import type { DiagramHoverChangeEvent } from "../types/events/DiagramHoverChangeEvent";
import { newEventId } from "../utils/core/newEventId";

/**
 * Type definition for hover props
 */
export type HoverProps = {
	id: string;
	onHoverChange?: (e: DiagramHoverChangeEvent) => void;
};

/**
 * Custom hook to handle hover events
 *
 * @param {HoverProps} props Hover props
 * @param {string} props.id ID of the element * @param {(e: DiagramHoverChangeEvent) => void} [props.onHoverChange] Event handler for hover change
 */
export const useHover = (props: HoverProps) => {
	const { id, onHoverChange } = props;
	/**
	 * Pointer enter event handler
	 */
	const handlePointerEnter = () => {
		// Fire hover event
		onHoverChange?.({
			eventId: newEventId(),
			id,
			isHovered: true,
		});
	};

	/**
	 * Pointer leave event handler
	 */
	const handlePointerLeave = () => {
		// Fire hover release event
		onHoverChange?.({
			eventId: newEventId(),
			id,
			isHovered: false,
		});
	};

	return {
		onPointerEnter: handlePointerEnter,
		onPointerLeave: handlePointerLeave,
	};
};
