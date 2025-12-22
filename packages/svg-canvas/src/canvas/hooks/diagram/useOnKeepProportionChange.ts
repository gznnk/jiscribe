import { useEffect, useRef } from "react";

import { KEEP_PROPORTION_CHANGE_EVENT_NAME } from "../../../constants/core/EventNames";
import type { DiagramKeepProportionChangeEvent } from "../../../types/events/DiagramKeepProportionChangeEvent";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import { MULTI_SELECT_GROUP } from "../../SvgCanvasConstants";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle diagram keepProportion change events from the event bus.
 * Listens for keepProportion change events and updates the canvas state accordingly.
 *
 * Special handling for MULTI_SELECT_GROUP:
 * When the id is MULTI_SELECT_GROUP, updates both:
 * - The keepProportion of all selected items
 * - The keepProportion of the multiSelectGroup itself
 */
export const useOnKeepProportionChange = (props: SvgCanvasSubHooksProps) => {
	const { eventBus, setCanvasState } = props;
	const addHistory = useAddHistory(props);

	const refBusVal = {
		eventBus,
		setCanvasState,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	useEffect(() => {
		const { eventBus } = refBus.current;

		const handleEvent = (event: Event) => {
			const e = (event as CustomEvent<DiagramKeepProportionChangeEvent>).detail;
			const { setCanvasState, addHistory } = refBus.current;

			setCanvasState((prevState) => {
				// Special handling for MULTI_SELECT_GROUP
				if (e.id === MULTI_SELECT_GROUP) {
					// Update keepProportion for all selected items
					const items = applyFunctionRecursively(prevState.items, (item) => {
						if (isSelectableState(item) && item.isSelected) {
							return { ...item, keepProportion: e.keepProportion };
						}
						return item;
					});

					// Update multiSelectGroup's keepProportion
					const multiSelectGroup = prevState.multiSelectGroup
						? {
								...prevState.multiSelectGroup,
								keepProportion: e.keepProportion,
							}
						: prevState.multiSelectGroup;

					// Create new state with updated items and multiSelectGroup
					let newState = {
						...prevState,
						items,
						multiSelectGroup,
					} as SvgCanvasState;

					// Add history
					newState = addHistory(e.eventId, newState);

					return newState;
				}

				// Standard handling for individual items
				const items = applyFunctionRecursively(prevState.items, (item) => {
					// If the id does not match, return the original item.
					if (item.id !== e.id) return item;

					// If the id matches, update the item with the new keepProportion value.
					return { ...item, keepProportion: e.keepProportion };
				});

				// Create new state with updated items.
				let newState = {
					...prevState,
					items,
				};

				// Add history
				newState = addHistory(e.eventId, newState);

				return newState;
			});
		};

		eventBus.addEventListener(KEEP_PROPORTION_CHANGE_EVENT_NAME, handleEvent);

		return () => {
			eventBus.removeEventListener(
				KEEP_PROPORTION_CHANGE_EVENT_NAME,
				handleEvent,
			);
		};
	}, []);
};
