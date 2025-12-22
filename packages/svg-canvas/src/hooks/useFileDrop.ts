import { useCallback, useRef } from "react";

import type { FileDropEvent } from "../types/events/FileDropEvent";
import { newEventId } from "../utils/core/newEventId";

/**
 * Type definition for useFileDrop hook options
 */
export type UseFileDropOptions = {
	id: string;
	onFileDrop?: (e: FileDropEvent) => void;
};

/**
 * Custom hook for handling file drop events
 *
 * @param options - Hook options
 * @param options.id - ID of the target element
 * @param options.onFileDrop - Callback function called when files are dropped
 */
export const useFileDrop = ({ id, onFileDrop }: UseFileDropOptions) => {
	// Store all reference values as an object in useRef
	const refBusVal = {
		id,
		onFileDrop,
	};
	const refBus = useRef(refBusVal);
	// Update reference values to the latest
	refBus.current = refBusVal;

	const onDragOver = useCallback<React.DragEventHandler>((event) => {
		// Only call preventDefault if the dragged items include files
		if (event.dataTransfer.types.includes("Files")) {
			event.preventDefault();
		}
	}, []);

	const onDrop = useCallback<React.DragEventHandler>((event) => {
		// Only call preventDefault if the dragged items include files
		if (event.dataTransfer.types.includes("Files")) {
			event.preventDefault();
			const files = event.dataTransfer.files;
			if (files && files.length > 0) {
				// Always reference the latest callback function via refBus
				if (refBus.current.onFileDrop) {
					refBus.current.onFileDrop({
						eventId: newEventId(),
						id: refBus.current.id,
						files,
					});
				}
			}
		}
	}, []); // Empty dependency array to prevent unnecessary recreation

	return { onDragOver, onDrop };
};
