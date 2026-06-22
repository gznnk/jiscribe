import type { CanvasControllerState } from "../../../CanvasTypes";
import { handleCommand } from "../../handlers/handleCommand";

/**
 * ObjectMenu / キーボードのコマンド実行と同じ入口（handleCommand）でコマンドを 1 つ実行する。
 * CommandRegistry の解決 + canExecute ゲート + execute を含む実経路を結合検証するためのヘルパー。
 */
export const runCommand = (
	state: CanvasControllerState,
	commandId: string,
): CanvasControllerState => handleCommand(state, commandId);
