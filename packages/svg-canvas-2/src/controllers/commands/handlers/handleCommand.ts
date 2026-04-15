import type { CanvasControllerState } from "../../CanvasTypes";
import { recordHistoryIfNeeded } from "../../utils/recordHistory";
import { commandRegistry } from "../CommandRegistry";

/**
 * COMMAND アクションを処理する
 * CommandRegistry に登録された Command を実行し、新しい CanvasControllerState を返す
 * 実行後に履歴記録が必要な場合は自動的に記録する
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

	const nextState = command.execute(state);

	// Record history if needed (similar to handleGesture)
	return recordHistoryIfNeeded(nextState, state.lastCommitTime);
};
