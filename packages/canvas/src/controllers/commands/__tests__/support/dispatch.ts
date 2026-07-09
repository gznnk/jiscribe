import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../setup/CanvasRegistries";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";
import { handleCommand } from "../../handlers/handleCommand";

/**
 * ObjectMenu / キーボードのコマンド実行と同じ入口（handleCommand）でコマンドを 1 つ実行する。
 * CommandRegistry の解決 + canExecute ゲート + execute を含む実経路を結合検証するためのヘルパー。
 * 入力 state は凍結してから渡し、コマンドによる in-place ミューテートを検知する。
 *
 * registries はデフォルトでフルバンドル（createTestRegistries）。特定 config を試すテストだけ明示指定する。
 */
export const runCommand = (
	state: CanvasControllerState,
	commandId: string,
	registries: CanvasRegistries = createTestRegistries(),
): CanvasControllerState =>
	handleCommand(deepFreezeState(state), commandId, registries);
