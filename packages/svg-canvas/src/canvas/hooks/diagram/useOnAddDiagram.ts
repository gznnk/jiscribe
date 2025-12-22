import { useEffect, useRef } from "react";

import { ADD_NEW_DIAGRAM_EVENT_NAME } from "../../../constants/core/EventNames";
import type { AddDiagramEvent } from "../../../types/events/AddDiagramEvent";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle new diagram events on the canvas.
 */
export const useOnAddDiagram = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	useEffect(() => {
		// Bypass references to avoid function creation in every render.
		const { eventBus } = refBus.current.props;

		// Listener for new diagram events.
		const newDiagramListener = (e: Event) => {
			// Bypass references to avoid function creation in every render.
			const {
				props: { setCanvasState },
				addHistory,
			} = refBus.current;

			const event = (e as CustomEvent<AddDiagramEvent>).detail;

			// Call the function to add a new item to the canvas.
			setCanvasState((prevState) => {
				let newState = {
					...prevState,
					items: [
						...prevState.items.map((i) => {
							if (isSelectableState(i) && isSelectableState(event.item)) {
								return {
									...i,
									// If the new item is selected, unselect other items.
									isSelected: event.item.isSelected ? false : i.isSelected,
								};
							}
							return i;
						}),
						{
							...event.item,
						},
					],
				} as SvgCanvasState;

				// Add history
				newState = addHistory(event.eventId, newState);

				return newState;
			});
		};

		// Add the event listener for new diagram events.
		eventBus.addEventListener(ADD_NEW_DIAGRAM_EVENT_NAME, newDiagramListener);

		// Cleanup the event listener on component unmount.
		return () => {
			eventBus.removeEventListener(
				ADD_NEW_DIAGRAM_EVENT_NAME,
				newDiagramListener,
			);
		};
	}, []);
};
