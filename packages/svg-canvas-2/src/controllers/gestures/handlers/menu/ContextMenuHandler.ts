import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { handleCommand } from "../../../commands/handlers/handleCommand";

/**
 * コンテキストメニュー項目のクリックを処理する GestureHandler
 * targetKind が "context-menu" の場合に処理を行う
 */
export const ContextMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "context-menu";
	},

	handle(state, event) {
		if (event.type === "click" && event.targetId) {
			// targetId から "context-menu:" プレフィックスを除去してコマンドIDを取得
			const commandId = event.targetId.replace("context-menu:", "");

			// COMMAND アクションを実行
			const nextState = handleCommand(state, commandId);

			// コンテキストメニューを閉じる
			return {
				...nextState,
				contextMenuPosition: null,
			};
		}

		return state;
	},
};
