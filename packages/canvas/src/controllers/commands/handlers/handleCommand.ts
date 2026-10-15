import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { reconcileGroupBounds } from "../../utils/reconcileGroupBounds";

/**
 * Whether a command may run while a drag is under way. Every drag frame is
 * rebuilt from the drag's start snapshot, so anything else a command changes
 * mid-drag — the objects, or the selection the drag reads — is discarded or
 * misapplied on the next frame while its commit stays in the history. Only
 * commands declared `"view"` are known to stay out of both; a command without a
 * category (a plugin's commonly has none) is refused with the rest.
 */
const canRunDuringDrag = (command: { category?: string }): boolean =>
	command.category === "view";

/**
 * Handles a COMMAND action.
 * Executes the Command registered in the canvas's command registry and returns a
 * new CanvasControllerState. History recording is delegated to canvasReducer.
 * Command lookup and execution both flow through the passed-in `registries` (#165).
 *
 * The ancestor group frames are settled on the way out, so a command is free to
 * hand back an object whose box it derived itself — which the built-in ones that
 * name their own ids do not need, and a contributed one has no way to do
 * (see reconcileGroupBounds).
 *
 * A command other than a view one arriving mid-drag is refused here rather than
 * in `canExecute`, so every route that runs a command is covered — the COMMAND
 * action (keyboard, host handle) and the menu handlers alike — and a shortcut
 * the canvas claims is still swallowed rather than falling through to the
 * browser (same split as canNavigateHistory).
 */
export const handleCommand = (
	state: CanvasControllerState,
	commandId: string,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const command = registries.command.get(commandId);

	if (!command) {
		console.warn(`Command not found: ${commandId}`);
		return state;
	}

	if (!command.execute) {
		// Callback-executed command (definition-only registration, e.g. paste):
		// reaching here means a caller dispatched COMMAND without wiring the callback.
		console.warn(
			`Command is callback-executed, not dispatchable: ${commandId}`,
		);
		return state;
	}

	if (state.activeDrag !== null && !canRunDuringDrag(command)) {
		return state;
	}

	if (!command.canExecute(state, registries)) {
		return state;
	}

	return reconcileGroupBounds(command.execute(state, registries), state);
};
