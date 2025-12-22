import { useCallback, useRef } from "react";

import type { TextEditorState } from "../../../components/core/Textable/TextEditor/TextEditorTypes";
import type { DiagramTextChangeEvent } from "../../../types/events/DiagramTextChangeEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle text change events on the canvas.
 * Handles both text editing initiation (Start) and text content changes (InProgress/End).
 */
export const useOnTextChange = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: DiagramTextChangeEvent) => {
		// Bypass references to avoid function creation in every render.
		const {
			props: { setCanvasState },
			addHistory,
		} = refBus.current;

		setCanvasState((prevState) => {
			// Handle text editing initiation
			if (e.eventPhase === "Started") {
				let targetItem: Diagram | undefined = undefined;

				const nextState = {
					...prevState,
					items: applyFunctionRecursively(prevState.items, (item) => {
						if (item.id === e.id) {
							targetItem = item;
							return {
								...item,
								isTextEditing: true,
							};
						}
						return item;
					}),
				};

				if (!targetItem) return prevState;

				if (e.activateEditor) {
					if (e.initializeAttributes) {
						// If initial attributes are provided, use them to create the text editor state.
						nextState.textEditorState = {
							id: e.id,
							...e.initializeAttributes,
							isActive: true,
						} as TextEditorState;
					} else {
						// If no initial attributes are provided, use the target item's attributes.
						nextState.textEditorState = {
							...(targetItem as object),
							isActive: true,
						} as TextEditorState;
					}
				}

				return nextState;
			}

			// Handle text content changes
			const isTextEditing = e.eventPhase !== "Ended";

			// Create a new state with the updated text.
			let nextState = {
				...prevState,
				items: applyFunctionRecursively(prevState.items, (item) =>
					item.id === e.id ? { ...item, text: e.text, isTextEditing } : item,
				),
			};

			if (nextState.textEditorState.isActive) {
				nextState.textEditorState = {
					...prevState.textEditorState,
					text: e.text,
					isActive: isTextEditing,
				};
			}

			// Notify about data change.
			if (e.eventPhase === "Ended") {
				nextState = addHistory(e.eventId, nextState);
			}

			return nextState;
		});
	}, []);
};
