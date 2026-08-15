import { type Dispatch, type RefObject, useEffect, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries/CanvasRegistries";

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
	/**
	 * Passed in explicitly (not read via context) because Canvas is the provider
	 * of the registries context and so cannot consume it via a hook.
	 */
	registries: CanvasRegistries;
};

/**
 * Custom hook that handles keyboard shortcuts.
 */
export const useKeyboardShortcuts = ({
	containerRef,
	canvasState,
	dispatch,
	callbacks,
	registries,
}: UseKeyboardShortcutsParams): void => {
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
			// Disabled while focus is in a field the keystroke belongs to: the form
			// elements, and the editable surface a shape's text is edited on — which
			// is a div, so it is recognized by being editable rather than by its tag
			// (isContentEditable is true inside the editable host as well).
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement ||
				(event.target instanceof HTMLElement && event.target.isContentEditable)
			) {
				return;
			}

			const command = commandRegistry.findByShortcut(event);
			if (!command) {
				return;
			}

			// Callback-executed commands (undo/redo when externally owned, paste)
			// are delegated without checking canExecute (see callbacks JSDoc).
			const callback = callbacksRef.current?.[command.id];
			if (callback) {
				event.preventDefault();
				event.stopPropagation();
				callback();
				return;
			}
			// A binding the command cannot execute right now is left to the browser,
			// so Tab keeps moving focus (and arrows keep scrolling) while the
			// matching command is unavailable.
			if (!command.canExecute(canvasStateRef.current, registries)) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			dispatch({ type: "COMMAND", commandId: command.id });
		};

		// Scoped to the container: keydown reaches here only while focus is inside
		// this Canvas (the root is focusable via tabIndex).
		container.addEventListener("keydown", handleKeyDown);
		return () => {
			container.removeEventListener("keydown", handleKeyDown);
		};
	}, [containerRef, dispatch, commandRegistry, registries]);
};
