import { useRef, useEffect } from "react";

import { STACK_ORDER_CHANGE_EVENT_NAME } from "../../../constants/core/EventNames";
import type { StackOrderChangeEvent } from "../../../types/events/StackOrderChangeEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import { isItemableState } from "../../../utils/validation/isItemableState";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { createSelectedDiagramPathIndex } from "../../utils/createSelectedDiagramPathIndex";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle stack order change events on the canvas.
 * Listens to STACK_ORDER_CHANGE_EVENT_NAME from the event bus and applies stack order changes.
 */
export const useOnStackOrderChange = (props: SvgCanvasSubHooksProps) => {
	const { eventBus, setCanvasState } = props;

	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		eventBus,
		setCanvasState,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Listen to stack order change events from the event bus
	useEffect(() => {
		const { eventBus } = refBus.current;

		const handleEvent = (event: Event) => {
			const customEvent = event as CustomEvent<StackOrderChangeEvent>;
			const e = customEvent.detail;

			// Bypass references to avoid function creation in every render.
			const { setCanvasState, addHistory } = refBus.current;

			setCanvasState((prevState) => {
				const moveInList = (items: Diagram[]): Diagram[] => {
					const index = items.findIndex((item) => item.id === e.id);
					if (index === -1) return items;

					const newItems = [...items];
					const [target] = newItems.splice(index, 1); // remove

					switch (e.changeType) {
						case "bringToFront":
							newItems.push(target);
							break;
						case "sendToBack":
							newItems.unshift(target);
							break;
						case "bringForward":
							if (index < newItems.length - 1) {
								newItems.splice(index + 1, 0, target);
							} else {
								newItems.push(target);
							}
							break;
						case "sendBackward":
							if (index > 0) {
								newItems.splice(index - 1, 0, target);
							} else {
								newItems.unshift(target);
							}
							break;
					}
					return newItems;
				};

				// Recursively search for the item with matching id and reorder the parent's items array
				const updateOrderRecursive = (items: Diagram[]): Diagram[] => {
					return items.map((item) => {
						if (isItemableState(item)) {
							// Check if this group contains the target item
							if (item.items?.some((child) => child.id === e.id)) {
								return {
									...item,
									items: moveInList(item.items),
								};
							}
							return {
								...item,
								items: updateOrderRecursive(item.items ?? []),
							};
						}
						return item;
					});
				};

				// Handle items at the top level
				let items = prevState.items;
				if (items.some((item) => item.id === e.id)) {
					items = moveInList(items);
				} else {
					items = updateOrderRecursive(items);
				}

				// Create path index for selected diagrams
				const selectedDiagramPathIndex = createSelectedDiagramPathIndex(items);

				// Create new state
				let newState: SvgCanvasState = {
					...prevState,
					items,
					selectedDiagramPathIndex,
				};

				// Add history
				newState = addHistory(e.eventId, newState);

				return newState;
			});
		};

		eventBus.addEventListener(STACK_ORDER_CHANGE_EVENT_NAME, handleEvent);

		return () => {
			eventBus.removeEventListener(STACK_ORDER_CHANGE_EVENT_NAME, handleEvent);
		};
	}, []);
};
