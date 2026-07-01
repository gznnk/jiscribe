import type { CanvasControllerState } from "../../CanvasTypes";
import { commandRegistry } from "../CommandRegistry";

/**
 * Handles a COMMAND action.
 * Executes the Command registered in CommandRegistry and returns a new CanvasControllerState.
 * History recording is delegated to canvasReducer.
 */
export const handleCommand = (
	state: CanvasControllerState,
	commandId: string,
): CanvasControllerState => {
	const command = commandRegistry.get(commandId);

	if (!command) {
		console.warn(`Command not found: ${commandId}`);
		return state;
	}

	if (!command.canExecute(state)) {
		return state;
	}

	return command.execute(state);
};
