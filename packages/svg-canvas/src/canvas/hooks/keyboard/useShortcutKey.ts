import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { TextEditorState } from "../../../components/core/Textable/TextEditor/TextEditorTypes";

/**
 * Properties for the useShortcutKey hook
 */
export type UseShortcutKeyProps = {
	/** Current zoom level of the SVG canvas */
	zoom: number;
	/** Current state of the SVG canvas focus */
	hasFocus: RefObject<boolean>;
	/** Current state of the text editor */
	textEditorState: TextEditorState;
	/** Handler for deleting selected items */
	onDelete?: () => void;
	/** Handler for selecting all items */
	onSelectAll?: () => void;
	/** Handler for clearing all selections */
	onClearAllSelection?: () => void;
	/** Handler for undo operation */
	onUndo?: () => void;
	/** Handler for redo operation */
	onRedo?: () => void;
	/** Handler for copy operation */
	onCopy?: () => void;
	/** Handler for paste operation */
	onPaste?: () => void;
	/** Function to handle zooming in or out */
	onZoom?: (zoom: number, options?: { clientX?: number; clientY?: number }) => void;
};

/** * Custom hook to handle keyboard shortcuts for the SVG canvas.
 * This hook manages global keyboard events and dispatches appropriate actions
 * based on the key combinations pressed.
 *
 * @param props - The properties for handling various shortcut operations
 */
export const useShortcutKey = (props: UseShortcutKeyProps): void => {
	// Store props in ref to avoid recreating effect on every prop change
	const propsRef = useRef(props);
	propsRef.current = props;

	useEffect(() => {
		/**
		 * Handle global keydown events for shortcuts
		 */
		const onDocumentKeyDown = (e: KeyboardEvent) => {
			const {
				zoom,
				hasFocus,
				textEditorState,
				onDelete,
				onSelectAll,
				onClearAllSelection,
				onUndo,
				onRedo,
				onCopy,
				onPaste,
				onZoom,
			} = propsRef.current;

			// Skip processing if SVG canvas doesn't have focus and text editor is not active
			if (!hasFocus.current && !textEditorState.isActive) {
				return;
			}

			if (e.key === "Escape") {
				// Clear selection when Escape key is pressed
				onClearAllSelection?.();
			}
			if (e.key === "Delete") {
				// Delete selected items when Delete key is pressed
				onDelete?.();
			}
			if (e.ctrlKey) {
				if (e.key === "z") {
					// Undo the last action when Ctrl+Z is pressed
					onUndo?.();
				}
				if (e.key === "y") {
					// Redo the last action when Ctrl+Y is pressed
					onRedo?.();
				}
				// Handle shortcuts that should not work when text editor is active
				if (!textEditorState.isActive) {
					if (e.key === "a") {
						// Select all items when Ctrl+A is pressed
						e.preventDefault();
						onSelectAll?.();
					}
					if (e.key === "c") {
						// Copy selected items when Ctrl+C is pressed
						e.preventDefault();
						onCopy?.();
					}
					if (e.key === "v") {
						// Paste items from clipboard when Ctrl+V is pressed
						e.preventDefault();
						onPaste?.();
					}
					// Zoom in when Ctrl+Plus is pressed (support multiple key variations)
					if (
						e.key === "+" ||
						e.key === "=" ||
						e.code === "Equal" ||
						e.code === "Semicolon"
					) {
						e.preventDefault();
						e.stopPropagation();
						onZoom?.(zoom * 1.1);
					}
					// Zoom out when Ctrl+Minus is pressed (support multiple key variations)
					if (e.key === "-" || e.code === "Minus") {
						e.preventDefault();
						e.stopPropagation();
						onZoom?.(zoom * 0.9);
					}
					// Reset zoom when Ctrl+0 is pressed
					if (e.key === "0" || e.code === "Digit0") {
						e.preventDefault();
						e.stopPropagation();
						onZoom?.(1.0);
					}
				}
			}
		};

		// Add event listener for keydown events
		document.addEventListener("keydown", onDocumentKeyDown);

		return () => {
			document.removeEventListener("keydown", onDocumentKeyDown);
		};
	}, []);
};
