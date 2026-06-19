import type { CanvasControllerState } from "../../CanvasTypes";
import { commandRegistry } from "../CommandRegistry";

/**
 * COMMAND アクションを処理する。
 * CommandRegistry に登録された Command を実行し、新しい CanvasControllerState を返す。
 * 履歴記録は canvasReducer に委譲する。
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
