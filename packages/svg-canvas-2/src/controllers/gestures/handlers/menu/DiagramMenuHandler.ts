import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { handleCommand } from "../../../commands/handlers/handleCommand";

/**
 * DiagramMenu 項目のクリックを処理する GestureHandler。
 * targetKind が "diagram-menu" の場合に処理を行う。
 */
export const DiagramMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "diagram-menu";
	},

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
		if (event.type === "click" && event.targetId) {
			// targetId から "diagram-menu:" プレフィックスを除去してコマンドIDを取得
			const commandId = event.targetId.replace("diagram-menu:", "");

			// toggle ボタンはコマンドではないので無視
			if (commandId.startsWith("toggle-")) {
				return state;
			}

			// COMMAND アクションを実行
			return handleCommand(state, commandId);
		}

		return state;
	},
};
