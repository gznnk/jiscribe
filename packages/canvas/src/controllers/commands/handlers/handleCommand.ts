import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";

/**
 * Handles a COMMAND action.
 * Executes the Command registered in the canvas's command registry and returns a
 * new CanvasControllerState. History recording is delegated to canvasReducer.
 * Command lookup and execution both flow through the passed-in `registries` (#165).
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

	if (!command.canExecute(state, registries)) {
		return state;
	}

	return command.execute(state, registries);
};
