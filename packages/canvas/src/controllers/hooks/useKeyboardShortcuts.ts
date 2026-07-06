import { type Dispatch, type RefObject, useEffect, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { commandRegistry } from "../commands/CommandRegistry";
import type { CanvasAction } from "../reducer/CanvasActions";

export type UseKeyboardShortcutsParams = {
	/**
	 * Focusable canvas root element (tabIndex-ed) the keydown listener is scoped to.
	 * Scoping to the container instead of `document` means only the focused Canvas
	 * handles shortcuts, so multiple Canvases on one page never double-execute.
	 */
	containerRef: RefObject<HTMLElement | null>;
	canvasState: CanvasControllerState;
	/** Canvas reducer dispatch (sends executable commands as COMMAND actions). */
	dispatch: Dispatch<CanvasAction>;
	/** When provided, handle Ctrl+Z with this callback instead of the Canvas-internal UndoCommand. */
	onUndo?: () => void;
	/** When provided, handle Ctrl+Shift+Z / Ctrl+Y with this callback instead of the Canvas-internal RedoCommand. */
	onRedo?: () => void;
};

/**
 * Custom hook that handles keyboard shortcuts.
 */
export const useKeyboardShortcuts = ({
	containerRef,
	canvasState,
	dispatch,
	onUndo,
	onRedo,
}: UseKeyboardShortcutsParams): void => {
	const canvasStateRef = useRef(canvasState);
	canvasStateRef.current = canvasState;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			// Disabled while focus is in input fields and similar elements
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement
			) {
				return;
			}

			const command = commandRegistry.findByShortcut(event);
			if (!command) {
				return;
			}

			// Always suppress the browser default action when a binding exists
			event.preventDefault();
			event.stopPropagation();

			// When an external callback is provided, delegate undo/redo without checking
			// canExecute (availability is decided by an external owner such as VSCode).
			if (command.id === "undo" && onUndo) {
				onUndo();
				return;
			}
			if (command.id === "redo" && onRedo) {
				onRedo();
				return;
			}
			if (command.canExecute(canvasStateRef.current)) {
				dispatch({ type: "COMMAND", commandId: command.id });
			}
		};

		// Scoped to the container: keydown reaches here only while focus is inside
		// this Canvas (the root is focusable via tabIndex).
		container.addEventListener("keydown", handleKeyDown);
		return () => {
			container.removeEventListener("keydown", handleKeyDown);
		};
	}, [containerRef, dispatch, onUndo, onRedo]);
};
