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
			// targetId から "diagram-menu:" プレフィックスを除去してIDを取得
			const actionId = event.targetId.replace("diagram-menu:", "");

			// toggle ボタン: セクションの開閉を切り替える
			if (actionId.startsWith("toggle-")) {
				const sectionId = actionId.replace("toggle-", "");
				return {
					...state,
					diagramMenuOpenId:
						state.diagramMenuOpenId === sectionId ? null : sectionId,
				};
			}

			// コマンドボタン: コマンドを実行
			return handleCommand(state, actionId);
		}

		return state;
	},
};
