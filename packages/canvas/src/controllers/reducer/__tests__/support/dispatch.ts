import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";
import type { CanvasAction } from "../../CanvasActions";
import { createCanvasReducer } from "../../canvasReducer";

/**
 * The registry bundle the shared test reducer closes over. Exported so tests
 * that need to inspect/spy the exact mapper the reducer uses (e.g. asserting
 * lazy history snapshots never call `objectMapper.toDoc`) can reference the same
 * instance rather than a divergent bundle.
 */
export const testReducerRegistries = createTestRegistries();

const canvasReducer = createCanvasReducer(testReducerRegistries);

/**
 * 一連の action を canvasReducer で順に畳み込み、最終 state を返す。
 * 結合テストで「dispatch を連続実行した結果」を表現するための薄いヘルパー。
 * 各ステップの入力 state を凍結し、reducer 経路の in-place ミューテートを検知する。
 */
export const applyActions = (
	state: CanvasControllerState,
	actions: CanvasAction[],
): CanvasControllerState =>
	actions.reduce(
		(current, action) => canvasReducer(deepFreezeState(current), action),
		state,
	);

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
