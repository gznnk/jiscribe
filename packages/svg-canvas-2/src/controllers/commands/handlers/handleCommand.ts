import type { CanvasState } from "../../../states/canvas/CanvasState";
import { commandRegistry } from "../CommandRegistry";

/**
 * COMMAND アクションを処理する
 * CommandRegistry に登録された Command を実行し、新しい CanvasState を返す
 */
export const handleCommand = (
	state: CanvasState,
	commandId: string,
): CanvasState => {
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
