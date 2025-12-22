import { useCallback, useRef } from "react";

import type {
	DiagramTextChangeEvent,
	TextEditorAttributes,
} from "../types/events/DiagramTextChangeEvent";
import { newEventId } from "../utils/core/newEventId";

export type UseTextProps = {
	id: string;
	isSelected: boolean;
	isTextEditEnabled?: boolean;
	attributes?: TextEditorAttributes | (() => TextEditorAttributes | undefined);
	onTextChange?: (e: DiagramTextChangeEvent) => void;
};

export type UseTextReturn = {
	onDoubleClick: () => void;
};

/**
 * Custom hook to handle text editing interactions for diagram items.
 * Provides a double-click handler that starts text editing when enabled.
 */
export const useText = (props: UseTextProps): UseTextReturn => {
	const {
		id,
		attributes,
		isSelected,
		isTextEditEnabled = true,
		onTextChange = () => {},
	} = props;

	// Create references bypass to avoid function creation in every render
	const refBusVal = {
		id,
		attributes,
		isSelected,
		isTextEditEnabled,
		onTextChange,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	const onDoubleClick = useCallback(() => {
		// Bypass references to avoid function creation in every render
		const { id, attributes, isSelected, isTextEditEnabled, onTextChange } =
			refBus.current;

		// Only start text editing if text editing is enabled and the item is selected
		if (!isTextEditEnabled || !isSelected) {
			return;
		}

		// Get attributes - if it's a function, call it, otherwise use directly
		const resolvedAttributes =
			typeof attributes === "function" ? attributes() : attributes;

		const textChangeEvent: DiagramTextChangeEvent = {
			eventId: newEventId(),
			eventPhase: "Started",
			id,
			text: "",
			activateEditor: true,
			initializeAttributes: resolvedAttributes,
		};
		onTextChange(textChangeEvent);
	}, []);

	return {
		onDoubleClick,
	};
};
