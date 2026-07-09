import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../setup/ICanvasRegistries";

/**
 * Handles a COMMAND action.
 * Executes the Command registered in the canvas's command registry and returns a
 * new CanvasControllerState. History recording is delegated to canvasReducer.
 *
 * `registries` is the per-canvas contract, passed explicitly (not read from state);
 * command lookup and execution both flow through it.
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

	if (!command.canExecute(state, registries)) {
		return state;
	}

	return command.execute(state, registries);
};
