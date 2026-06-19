import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasAction } from "../../CanvasActions";
import { canvasReducer } from "../../canvasReducer";

/**
 * 一連の action を canvasReducer で順に畳み込み、最終 state を返す。
 * 結合テストで「dispatch を連続実行した結果」を表現するための薄いヘルパー。
 */
export const applyActions = (
	state: CanvasControllerState,
	actions: CanvasAction[],
): CanvasControllerState =>
	actions.reduce((current, action) => canvasReducer(current, action), state);

/** COMMAND action を組み立てる小さなファクトリ */
export const command = (commandId: string): CanvasAction => ({
	type: "COMMAND",
	commandId,
});

/**
 * 複数のコマンドを ID 列で順に実行する糖衣。
 * 例: runCommands(state, "move-right", "move-right", "undo")
 */
export const runCommands = (
	state: CanvasControllerState,
	...commandIds: string[]
): CanvasControllerState => applyActions(state, commandIds.map(command));
