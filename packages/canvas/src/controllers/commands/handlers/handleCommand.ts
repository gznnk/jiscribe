import type { CanvasControllerState } from "../../CanvasTypes";

/**
 * Handles a COMMAND action.
 * Executes the Command registered in the canvas's command registry and returns a
 * new CanvasControllerState. History recording is delegated to canvasReducer.
 */
export const handleCommand = (
	state: CanvasControllerState,
	commandId: string,
): CanvasControllerState => {
	const command = state.registries.command.get(commandId);

	if (!command) {
		console.warn(`Command not found: ${commandId}`);
		return state;
	}

	if (!command.canExecute(state)) {
		return state;
	}

	return command.execute(state);
};
