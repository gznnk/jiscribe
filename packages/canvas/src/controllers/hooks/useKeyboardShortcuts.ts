import { type Dispatch, type RefObject, useEffect, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { useCanvasRegistries } from "../contexts/CanvasRegistriesContext";
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
	/**
	 * Commands executed via callback instead of dispatch, keyed by command id.
	 * A matched command with an entry here is delegated without checking
	 * canExecute (availability is decided by the callback owner — e.g. undo/redo
	 * by an external host such as VSCode, paste by the async clipboard read).
	 */
	callbacks?: Partial<Record<string, () => void>>;
};

/**
 * Custom hook that handles keyboard shortcuts.
 */
export const useKeyboardShortcuts = ({
	containerRef,
	canvasState,
	dispatch,
	callbacks,
}: UseKeyboardShortcutsParams): void => {
	const registries = useCanvasRegistries();
	const commandRegistry = registries.command;

	const canvasStateRef = useRef(canvasState);
	canvasStateRef.current = canvasState;

	// Held in a ref so an inline callbacks object does not re-register the listener
	// every render (same pattern as canvasStateRef).
	const callbacksRef = useRef(callbacks);
	callbacksRef.current = callbacks;

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

			// Callback-executed commands (undo/redo when externally owned, paste)
			// are delegated without checking canExecute (see callbacks JSDoc).
			const callback = callbacksRef.current?.[command.id];
			if (callback) {
				callback();
				return;
			}
			if (command.canExecute(canvasStateRef.current, registries)) {
				dispatch({ type: "COMMAND", commandId: command.id });
			}
		};

		// Scoped to the container: keydown reaches here only while focus is inside
		// this Canvas (the root is focusable via tabIndex).
		container.addEventListener("keydown", handleKeyDown);
		return () => {
			container.removeEventListener("keydown", handleKeyDown);
		};
	}, [containerRef, dispatch, commandRegistry, registries]);
};
